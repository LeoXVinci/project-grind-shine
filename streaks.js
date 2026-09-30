/**
 * PROJECT GRIND & SHINE
 * Streak Calculation Engine
 * Strictly honors habit schedules (skips non-scheduled days)
 * Enforces: target must be reached (partial does not extend streak)
 * Detects "DON'T MISS TWICE" conditions.
 */

const Streaks = (() => {
  /**
   * Find the most recent scheduled date strictly prior to referenceDate.
   */
  function getPreviousScheduledDate(habit, referenceDateKey) {
    if (!habit || !habit.startDate) return null;
    let curr = Utils.addDays(referenceDateKey, -1);
    const limit = Math.max(365 * 5, 100); // look back up to 5 years
    let count = 0;

    while (curr >= habit.startDate && count < limit) {
      if (Utils.isHabitScheduled(habit, curr)) {
        return curr;
      }
      curr = Utils.addDays(curr, -1);
      count++;
    }
    return null;
  }

  /**
   * Check if a habit qualifies for "DON'T MISS TWICE":
   * 1. Habit is active and scheduled for today
   * 2. Today is not yet completed
   * 3. The previous scheduled day was missed (entry absent or completed == false)
   */
  async function checkDontMissTwice(habit, todayKey = Utils.getTodayDateKey()) {
    if (!habit || habit.archived) return false;
    if (!Utils.isHabitScheduled(habit, todayKey)) return false;

    // Check if today is already complete
    const todayEntry = await Entries.getEntry(habit.id, todayKey);
    if (todayEntry && todayEntry.completed) return false;

    // Find previous scheduled day
    const prevDate = getPreviousScheduledDate(habit, todayKey);
    if (!prevDate) return false;

    const prevEntry = await Entries.getEntry(habit.id, prevDate);
    // If previous scheduled day was missed or incomplete, trigger warning
    return !prevEntry || !prevEntry.completed;
  }

  /**
   * Calculate streaks for a habit across its entire recorded timeline.
   * Returns:
   *   currentStreak: number
   *   longestStreak: number
   *   totalCompletedDays: number
   *   totalScheduledDays: number
   *   completionRate: number (percentage 0-100)
   */
  async function calculateHabitStreaks(habit, todayKey = Utils.getTodayDateKey()) {
    if (!habit) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalCompletedDays: 0,
        totalScheduledDays: 0,
        completionRate: 0,
        dontMissTwice: false
      };
    }

    const allEntries = await Entries.getEntriesForHabit(habit.id);
    const entriesMap = new Map();
    let minEntryDate = todayKey;

    for (const entry of allEntries) {
      entriesMap.set(entry.date, entry);
      if (entry.date < minEntryDate) {
        minEntryDate = entry.date;
      }
    }

    const startDate = habit.startDate && habit.startDate < minEntryDate 
      ? habit.startDate 
      : minEntryDate;

    // Build timeline of all scheduled dates from startDate to todayKey
    const scheduledDates = [];
    let curDate = startDate;
    while (curDate <= todayKey) {
      if (Utils.isHabitScheduled(habit, curDate)) {
        scheduledDates.push(curDate);
      }
      curDate = Utils.addDays(curDate, 1);
    }

    let longestStreak = 0;
    let tempStreak = 0;
    let totalCompletedDays = 0;

    // Scan forward through all scheduled days to compute longest streak and total completions
    for (let i = 0; i < scheduledDates.length; i++) {
      const dKey = scheduledDates[i];
      const entry = entriesMap.get(dKey);
      const isComplete = entry && Boolean(entry.completed);

      if (isComplete) {
        tempStreak++;
        totalCompletedDays++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        // If it's today and not complete yet, we don't necessarily break the historical streak
        if (dKey === todayKey) {
          // Today is still in progress
        } else {
          tempStreak = 0;
        }
      }
    }

    // Now calculate CURRENT STREAK walking backward from today
    let currentStreak = 0;
    const isTodayScheduled = Utils.isHabitScheduled(habit, todayKey);
    const todayEntry = entriesMap.get(todayKey);
    const isTodayCompleted = todayEntry && Boolean(todayEntry.completed);

    let startIdx = scheduledDates.length - 1;

    if (isTodayScheduled) {
      if (isTodayCompleted) {
        currentStreak++;
        startIdx--; // inspect yesterday backwards
      } else {
        // Today is scheduled but not completed yet.
        // Current streak is preserved from the previous scheduled day if completed!
        startIdx--;
      }
    } else {
      // Today is not scheduled, walk back from last scheduled day
    }

    // Walk backward through previous scheduled days
    while (startIdx >= 0) {
      const dKey = scheduledDates[startIdx];
      const entry = entriesMap.get(dKey);
      if (entry && entry.completed) {
        currentStreak++;
        startIdx--;
      } else {
        break; // Streak broken
      }
    }

    const totalScheduledDays = scheduledDates.length;
    const completionRate = totalScheduledDays > 0 
      ? Math.round((totalCompletedDays / totalScheduledDays) * 100) 
      : 0;

    const dontMissTwice = await checkDontMissTwice(habit, todayKey);

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalCompletedDays,
      totalScheduledDays,
      completionRate,
      dontMissTwice
    };
  }

  return {
    getPreviousScheduledDate,
    checkDontMissTwice,
    calculateHabitStreaks
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Streaks;
}
