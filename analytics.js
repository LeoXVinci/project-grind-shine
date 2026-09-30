/**
 * PROJECT GRIND & SHINE
 * Analytics Engine & Metrics Calculation
 * Computes Daily Score (capped at 100% per habit), Consistency Windows,
 * Numerical Performance, and Heatmap Grid Data.
 */

const Analytics = (() => {
  /**
   * Calculate today's summary metrics
   */
  async function getTodaySummary(activeHabits, dateKey = Utils.getTodayDateKey()) {
    const todayEntries = await Entries.getEntriesForDate(dateKey);
    const entryMap = new Map(todayEntries.map(e => [e.habitId, e]));

    let scheduledCount = 0;
    let completedCount = 0;
    let partialCount = 0;
    let missedCount = 0;
    let cappedScoreSum = 0;
    let uncappedAchievementSum = 0;
    let dontMissTwiceCount = 0;

    for (const habit of activeHabits) {
      if (Utils.isHabitScheduled(habit, dateKey)) {
        scheduledCount++;
        const entry = entryMap.get(habit.id);
        const pct = entry ? entry.percentage : 0;
        const isComplete = entry ? Boolean(entry.completed) : false;

        uncappedAchievementSum += pct;
        cappedScoreSum += Math.min(100, pct);

        if (isComplete) {
          completedCount++;
        } else if (pct >= 50) {
          partialCount++;
        } else {
          missedCount++;
        }

        const isDmt = await Streaks.checkDontMissTwice(habit, dateKey);
        if (isDmt) {
          dontMissTwiceCount++;
        }
      }
    }

    const dailyScore = scheduledCount > 0 
      ? Math.round(cappedScoreSum / scheduledCount) 
      : 0;

    const avgAchievement = scheduledCount > 0 
      ? Math.round(uncappedAchievementSum / scheduledCount) 
      : 0;

    const completionRate = scheduledCount > 0 
      ? Math.round((completedCount / scheduledCount) * 100) 
      : 0;

    return {
      date: dateKey,
      scheduled: scheduledCount,
      completed: completedCount,
      partial: partialCount,
      missed: missedCount,
      dailyScore,
      avgAchievement,
      completionRate,
      dontMissTwiceCount
    };
  }

  /**
   * Consistency over N days (e.g. 7, 30, 90, All-time)
   */
  async function calculateConsistency(activeHabits, daysWindow = 30, referenceDate = Utils.getTodayDateKey()) {
    if (activeHabits.length === 0) return 0;

    let startDateKey;
    if (daysWindow === 'all') {
      let earliest = referenceDate;
      for (const h of activeHabits) {
        if (h.startDate && h.startDate < earliest) earliest = h.startDate;
      }
      startDateKey = earliest;
    } else {
      startDateKey = Utils.addDays(referenceDate, -daysWindow + 1);
    }

    const allEntries = await Entries.getAllEntries();
    const entryLookup = new Set();
    for (const e of allEntries) {
      if (e.completed) {
        entryLookup.add(`${e.habitId}_${e.date}`);
      }
    }

    let totalScheduledOccurrences = 0;
    let totalCompletedOccurrences = 0;

    let cur = startDateKey;
    while (cur <= referenceDate) {
      for (const h of activeHabits) {
        if (Utils.isHabitScheduled(h, cur)) {
          totalScheduledOccurrences++;
          if (entryLookup.has(`${h.id}_${cur}`)) {
            totalCompletedOccurrences++;
          }
        }
      }
      cur = Utils.addDays(cur, 1);
    }

    return totalScheduledOccurrences > 0
      ? Math.round((totalCompletedOccurrences / totalScheduledOccurrences) * 100)
      : 0;
  }

  /**
   * Comprehensive metrics for a specific habit
   */
  async function getHabitDetailedMetrics(habit, referenceDate = Utils.getTodayDateKey()) {
    const entries = await Entries.getEntriesForHabit(habit.id);
    const streaks = await Streaks.calculateHabitStreaks(habit, referenceDate);

    let sumActual = 0;
    let maxActual = 0;
    let sumAchievement = 0;
    let recordedDaysCount = 0;
    let partialDaysCount = 0;

    for (const e of entries) {
      const val = Number(e.value) || 0;
      const pct = Number(e.percentage) || 0;
      sumActual += val;
      sumAchievement += pct;
      recordedDaysCount++;
      if (val > maxActual) maxActual = val;
      if (!e.completed && pct >= 50) {
        partialDaysCount++;
      }
    }

    const avgActual = recordedDaysCount > 0 ? (sumActual / recordedDaysCount).toFixed(1) : '0';
    const avgAchievement = recordedDaysCount > 0 ? Math.round(sumAchievement / recordedDaysCount) : 0;
    const partialRate = streaks.totalScheduledDays > 0 
      ? Math.round((partialDaysCount / streaks.totalScheduledDays) * 100) 
      : 0;

    return {
      habit,
      ...streaks,
      avgActual,
      maxActual,
      avgAchievement,
      partialDaysCount,
      partialRate,
      recordedDaysCount
    };
  }

  /**
   * Build Heatmap Data for GitHub-style calendar
   * Defaults to last 52 weeks (364 days) up to today
   */
  async function generateHeatmapData(activeHabits, referenceDate = Utils.getTodayDateKey(), daysBack = 180) {
    const allEntries = await Entries.getAllEntries();
    const completedLookup = new Map(); // date -> count completed

    for (const e of allEntries) {
      if (e.completed) {
        completedLookup.set(e.date, (completedLookup.get(e.date) || 0) + 1);
      }
    }

    const startDate = Utils.addDays(referenceDate, -daysBack);
    const days = [];
    let cur = startDate;

    while (cur <= referenceDate) {
      // Find how many habits were scheduled on this date
      let scheduledCount = 0;
      for (const h of activeHabits) {
        if (Utils.isHabitScheduled(h, cur)) {
          scheduledCount++;
        }
      }

      const completedCount = completedLookup.get(cur) || 0;
      let level = 0;

      if (scheduledCount > 0) {
        const ratio = completedCount / scheduledCount;
        if (completedCount === 0) {
          level = 0;
        } else if (ratio < 0.35) {
          level = 1;
        } else if (ratio < 0.7) {
          level = 2;
        } else if (ratio < 1) {
          level = 3;
        } else {
          level = 4; // Complete / Mission Accomplished
        }
      }

      days.push({
        date: cur,
        level,
        completed: completedCount,
        scheduled: scheduledCount
      });

      cur = Utils.addDays(cur, 1);
    }

    return days;
  }

  return {
    getTodaySummary,
    calculateConsistency,
    getHabitDetailedMetrics,
    generateHeatmapData
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Analytics;
}
