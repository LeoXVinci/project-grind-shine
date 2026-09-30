/**
 * PROJECT GRIND & SHINE
 * Dashboard UI & Data Visualization Module
 * Renders executive mission stats, tactical consistency gauges,
 * habit performance tables, and pure lightweight SVG/Canvas charts.
 */

const Dashboard = (() => {
  async function renderDashboard(containerId = 'dashboard-content') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>CALCULATING OPERATIONAL METRICS...</p></div>';

    const activeHabits = await Habits.getActive();
    const todaySummary = await Analytics.getTodaySummary(activeHabits);
    const c7 = await Analytics.calculateConsistency(activeHabits, 7);
    const c30 = await Analytics.calculateConsistency(activeHabits, 30);
    const c90 = await Analytics.calculateConsistency(activeHabits, 90);
    const cAll = await Analytics.calculateConsistency(activeHabits, 'all');

    // Streaks metrics
    let bestCurrentStreak = 0;
    let bestCurrentHabitName = 'None';
    let bestLongestStreak = 0;
    let bestLongestHabitName = 'None';
    let totalStreakDays = 0;
    let activeStreaksCount = 0;

    const detailedHabitsMetrics = [];

    for (const h of activeHabits) {
      const metrics = await Analytics.getHabitDetailedMetrics(h);
      detailedHabitsMetrics.push(metrics);

      if (metrics.currentStreak > 0) {
        activeStreaksCount++;
        totalStreakDays += metrics.currentStreak;
      }
      if (metrics.currentStreak > bestCurrentStreak) {
        bestCurrentStreak = metrics.currentStreak;
        bestCurrentHabitName = h.name;
      }
      if (metrics.longestStreak > bestLongestStreak) {
        bestLongestStreak = metrics.longestStreak;
        bestLongestHabitName = h.name;
      }
    }

    // Build Tactical HTML
    let html = `
      <div class="dashboard-grid">
        <!-- Section 1: Today's Mission Status -->
        <div class="card dashboard-card">
          <div class="card-header">
            <span class="card-tag">TODAY'S MISSION STATUS</span>
            <span class="card-date">${Utils.formatDisplayDate(todaySummary.date)}</span>
          </div>
          <div class="stat-highlight-row">
            <div class="stat-box primary">
              <span class="stat-val">${todaySummary.dailyScore}%</span>
              <span class="stat-lbl">DAILY SCORE (CAPPED)</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">${todaySummary.completed} / ${todaySummary.scheduled}</span>
              <span class="stat-lbl">COMPLETED</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">${todaySummary.partial}</span>
              <span class="stat-lbl">PARTIAL</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">${todaySummary.missed}</span>
              <span class="stat-lbl">MISSED</span>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${Math.min(100, todaySummary.dailyScore)}%;"></div>
          </div>
          <p class="stat-subtext">Avg Target Achievement: <strong>${todaySummary.avgAchievement}%</strong></p>
        </div>

        <!-- Section 2: Streak Intelligence -->
        <div class="card dashboard-card">
          <div class="card-header">
            <span class="card-tag">STREAK COMMAND</span>
            <span class="badge badge-gold">CHAIN RESILIENCE</span>
          </div>
          <div class="stat-grid-4">
            <div class="stat-box">
              <span class="stat-val">${activeStreaksCount} / ${activeHabits.length}</span>
              <span class="stat-lbl">ACTIVE STREAKS</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">${bestCurrentStreak}d</span>
              <span class="stat-lbl">BEST CURRENT (${Utils.escapeHtml(bestCurrentHabitName)})</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">${bestLongestStreak}d</span>
              <span class="stat-lbl">LONGEST ALL-TIME (${Utils.escapeHtml(bestLongestHabitName)})</span>
            </div>
            <div class="stat-box">
              <span class="stat-val">${totalStreakDays}</span>
              <span class="stat-lbl">TOTAL STREAK DAYS</span>
            </div>
          </div>
        </div>

        <!-- Section 3: Consistency Windows -->
        <div class="card dashboard-card">
          <div class="card-header">
            <span class="card-tag">CONSISTENCY WINDOWS</span>
            <span class="badge badge-outline">NON-NEGOTIABLE</span>
          </div>
          <div class="consistency-row">
            <div class="consistency-gauge">
              <span class="gauge-val ${c7 >= 80 ? 'good' : ''}">${c7}%</span>
              <span class="gauge-lbl">7-DAY</span>
            </div>
            <div class="consistency-gauge">
              <span class="gauge-val ${c30 >= 80 ? 'good' : ''}">${c30}%</span>
              <span class="gauge-lbl">30-DAY</span>
            </div>
            <div class="consistency-gauge">
              <span class="gauge-val ${c90 >= 80 ? 'good' : ''}">${c90}%</span>
              <span class="gauge-lbl">90-DAY</span>
            </div>
            <div class="consistency-gauge">
              <span class="gauge-val ${cAll >= 80 ? 'good' : ''}">${cAll}%</span>
              <span class="gauge-lbl">ALL-TIME</span>
            </div>
          </div>
        </div>

        <!-- Section 4: Trend Visualizations -->
        <div class="card dashboard-card">
          <div class="card-header">
            <span class="card-tag">OPERATIONAL CHARTS</span>
            <span class="badge badge-subtle">LAST 14 DAYS</span>
          </div>
          <div class="chart-container" id="completion-trend-chart"></div>
        </div>

        <!-- Section 5: Habit Performance Table -->
        <div class="card dashboard-card">
          <div class="card-header">
            <span class="card-tag">INDIVIDUAL HABIT PERFORMANCE</span>
            <span class="badge">${activeHabits.length} ACTIVE</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>HABIT</th>
                  <th>TYPE</th>
                  <th>CURRENT</th>
                  <th>BEST</th>
                  <th>RATE</th>
                  <th>SUCCESS / TOTAL</th>
                  <th>AVG ACHIEVE</th>
                </tr>
              </thead>
              <tbody>
    `;

    for (const m of detailedHabitsMetrics) {
      const h = m.habit;
      html += `
        <tr>
          <td>
            <div class="table-habit-cell">
              <span class="habit-icon-sm" style="color: ${h.color};">${h.icon}</span>
              <div class="table-habit-info">
                <span class="table-habit-name">${Utils.escapeHtml(h.name)}</span>
                <span class="table-habit-target">${h.type === 'boolean' ? 'YES/NO' : h.target + ' ' + h.unit}</span>
              </div>
            </div>
          </td>
          <td><span class="type-pill ${h.type}">${h.type.toUpperCase()}</span></td>
          <td><strong>${m.currentStreak}d</strong></td>
          <td>${m.longestStreak}d</td>
          <td>
            <div class="rate-badge ${m.completionRate >= 80 ? 'high' : m.completionRate >= 50 ? 'med' : 'low'}">
              ${m.completionRate}%
            </div>
          </td>
          <td>${m.totalCompletedDays} / ${m.totalScheduledDays}</td>
          <td>${m.avgAchievement}%</td>
        </tr>
      `;
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>

        <!-- Section 6: Numerical Habits Deep-Dive -->
        <div class="card dashboard-card">
          <div class="card-header">
            <span class="card-tag">NUMERICAL & DURATION VOLUME</span>
            <span class="badge badge-gold">QUANTIFIABLE OUTPUT</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>HABIT</th>
                  <th>TARGET</th>
                  <th>AVG RECORDED</th>
                  <th>HIGHEST RECORDED</th>
                  <th>ACHIEVEMENT %</th>
                </tr>
              </thead>
              <tbody>
    `;

    const numericMetrics = detailedHabitsMetrics.filter(m => m.habit.type !== 'boolean');
    if (numericMetrics.length === 0) {
      html += `<tr><td colspan="5" class="empty-state">No numeric or duration habits configured.</td></tr>`;
    } else {
      for (const m of numericMetrics) {
        const h = m.habit;
        html += `
          <tr>
            <td>
              <span style="color: ${h.color}; margin-right: 6px;">${h.icon}</span>
              <strong>${Utils.escapeHtml(h.name)}</strong>
            </td>
            <td>${h.target} ${h.unit}</td>
            <td><strong>${m.avgActual}</strong> ${h.unit}</td>
            <td><strong>${m.maxActual}</strong> ${h.unit}</td>
            <td><span class="rate-badge ${m.avgAchievement >= 100 ? 'high' : 'med'}">${m.avgAchievement}%</span></td>
          </tr>
        `;
      }
    }

    html += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Render lightweight SVG completion trend chart
    await renderCompletionTrendChart('completion-trend-chart', activeHabits);
  }

  /**
   * Render a clean 14-day completion trend SVG chart
   */
  async function renderCompletionTrendChart(elementId, activeHabits) {
    const chartEl = document.getElementById(elementId);
    if (!chartEl) return;

    const daysBack = 14;
    const today = Utils.getTodayDateKey();
    const dataPoints = [];

    for (let i = daysBack - 1; i >= 0; i--) {
      const dKey = Utils.addDays(today, -i);
      const summary = await Analytics.getTodaySummary(activeHabits, dKey);
      dataPoints.push({
        date: dKey,
        shortDate: Utils.formatShortDate(dKey).split(',')[0],
        score: summary.dailyScore,
        rate: summary.completionRate
      });
    }

    const width = 600;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 35, left: 35 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Coordinates generator
    const points = dataPoints.map((d, idx) => {
      const x = padding.left + (idx / (dataPoints.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - (d.score / 100) * chartHeight;
      return { x, y, ...d };
    });

    const pathData = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const areaData = `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    let svg = `
      <svg viewBox="0 0 ${width} ${height}" class="svg-chart" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Horizontal Guide Lines -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="var(--border-subtle)" stroke-dasharray="4"/>
        <text x="${padding.left - 8}" y="${padding.top + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">100%</text>

        <line x1="${padding.left}" y1="${padding.top + chartHeight / 2}" x2="${width - padding.right}" y2="${padding.top + chartHeight / 2}" stroke="var(--border-subtle)" stroke-dasharray="4"/>
        <text x="${padding.left - 8}" y="${padding.top + chartHeight / 2 + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">50%</text>

        <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="var(--border-subtle)"/>
        <text x="${padding.left - 8}" y="${padding.top + chartHeight + 4}" fill="var(--text-muted)" font-size="10" text-anchor="end">0%</text>

        <!-- Area fill -->
        <path d="${areaData}" fill="url(#trendGradient)" />

        <!-- Line path -->
        <path d="${pathData}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Dots and X Axis Labels -->
    `;

    points.forEach((p, idx) => {
      svg += `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#f59e0b" stroke="var(--surface-card)" stroke-width="2"/>
        <text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1) - 8}" fill="var(--text-main)" font-size="10" font-weight="600" text-anchor="middle">${p.score}%</text>
      `;
      // Every other label for cleanliness
      if (idx % 2 === 0 || idx === points.length - 1) {
        svg += `
          <text x="${p.x.toFixed(1)}" y="${height - 8}" fill="var(--text-muted)" font-size="9" text-anchor="middle">${p.shortDate}</text>
        `;
      }
    });

    svg += `</svg>`;
    chartEl.innerHTML = svg;
  }

  return {
    renderDashboard,
    renderCompletionTrendChart
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
}
