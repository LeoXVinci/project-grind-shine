/**
 * PROJECT GRIND & SHINE
 * UI Controller & View Manager
 * Handles DOM rendering, modal interactions, touch gestures,
 * and seamless screen switching.
 */

const UI = (() => {
  let currentTab = 'today';
  let historyFilter = '30';
  let historyHabitFilter = 'all';

  // Preset emojis for icon picker
  const ICONS = Habits.DEFAULT_ICONS;
  const COLORS = Habits.PRESET_COLORS;

  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    const fab = document.getElementById('fab-add-habit');
    if (fab) {
      fab.addEventListener('click', () => openHabitModal());
    }
  }

  function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.app-screen').forEach(screen => {
      screen.classList.toggle('active', screen.id === `screen-${tabName}`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh data for the newly active screen
    refreshCurrentScreen();
  }

  async function refreshCurrentScreen() {
    switch (currentTab) {
      case 'today':
        await renderTodayScreen();
        break;
      case 'dashboard':
        await Dashboard.renderDashboard();
        break;
      case 'history':
        await renderHistoryScreen();
        break;
      case 'habits':
        await renderHabitsScreen();
        break;
      case 'settings':
        await renderSettingsScreen();
        break;
    }
  }

  /* ==========================================================================
     TODAY SCREEN
     ========================================================================== */
  async function renderTodayScreen() {
    const container = document.getElementById('today-habits-container');
    const headerDate = document.getElementById('today-display-date');
    const progressText = document.getElementById('today-progress-text');
    const scoreVal = document.getElementById('today-score-val');
    const progressBar = document.getElementById('today-progress-bar');
    const motivationHeadline = document.getElementById('today-motivation-headline');
    const motivationSubtext = document.getElementById('today-motivation-subtext');
    const principleText = document.getElementById('today-principle-text');
    const habitLimitBanner = document.getElementById('today-habit-limit-banner');

    const todayKey = Utils.getTodayDateKey();
    if (headerDate) headerDate.textContent = Utils.formatDisplayDate(todayKey);

    const activeHabits = await Habits.getActive();
    const todaySummary = await Analytics.getTodaySummary(activeHabits, todayKey);
    const todayEntries = await Entries.getEntriesForDate(todayKey);
    const entriesMap = new Map(todayEntries.map(e => [e.habitId, e]));

    // Update Top Progress Bar & Daily Score
    if (progressText) {
      progressText.textContent = `${todaySummary.completed} / ${todaySummary.scheduled} COMPLETE (${todaySummary.completionRate}%)`;
    }
    if (scoreVal) {
      scoreVal.textContent = `${todaySummary.dailyScore}%`;
    }
    if (progressBar) {
      progressBar.style.width = `${Math.min(100, todaySummary.dailyScore)}%`;
    }

    // Update Motivational Banner
    const motivationInfo = Motivation.getMessageForState({
      scheduled: todaySummary.scheduled,
      completed: todaySummary.completed,
      partial: todaySummary.partial,
      missed: todaySummary.missed,
      maxStreak: 0
    });

    if (motivationHeadline) motivationHeadline.textContent = motivationInfo.headline;
    if (motivationSubtext) motivationSubtext.textContent = motivationInfo.subtext;
    if (principleText) principleText.textContent = `"${Motivation.getDailyPrinciple(todayKey)}"`;

    // Habit limit warning banner
    if (habitLimitBanner) {
      const count = activeHabits.length;
      if (count >= Habits.MAX_ACTIVE_HABITS) {
        habitLimitBanner.innerHTML = `
          <div class="limit-warning alert-full">
            <span>20 / 20 HABITS — Maximum active capacity reached. Archive an existing habit before adding another.</span>
          </div>`;
        habitLimitBanner.style.display = 'block';
      } else if (count >= 18) {
        habitLimitBanner.innerHTML = `
          <div class="limit-warning alert-subtle">
            <span>${count} / 20 HABITS — Approaching active mission threshold.</span>
          </div>`;
        habitLimitBanner.style.display = 'block';
      } else {
        habitLimitBanner.innerHTML = '';
        habitLimitBanner.style.display = 'none';
      }
    }

    if (!container) return;

    if (activeHabits.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card card">
          <div class="empty-icon">🎯</div>
          <h3>NO ACTIVE HABITS CONFIGURED</h3>
          <p>Discipline begins with the first standard. Create your first operational habit to begin tracking.</p>
          <button class="btn btn-primary" onclick="UI.openHabitModal()">+ ADD FIRST HABIT</button>
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    let scheduledCount = 0;

    for (const habit of activeHabits) {
      const isScheduled = Utils.isHabitScheduled(habit, todayKey);
      if (!isScheduled) continue; // Only show habits scheduled for today on the Today screen!
      scheduledCount++;

      const entry = entriesMap.get(habit.id);
      const val = entry ? entry.value : (habit.type === 'boolean' ? 0 : 0);
      const isComplete = entry ? Boolean(entry.completed) : false;
      const target = entry ? entry.target : habit.target;
      const pct = entry ? entry.percentage : 0;
      const streaks = await Streaks.calculateHabitStreaks(habit, todayKey);
      const isDmt = streaks.dontMissTwice;

      let statusBadge = '';
      if (isComplete) {
        statusBadge = `<span class="badge badge-complete">COMPLETE (${pct}%)</span>`;
      } else if (pct >= 50) {
        statusBadge = `<span class="badge badge-partial">PARTIAL (${pct}%)</span>`;
      } else if (val > 0) {
        statusBadge = `<span class="badge badge-low">LOW (${pct}%)</span>`;
      } else {
        statusBadge = `<span class="badge badge-pending">PENDING</span>`;
      }

      cardsHtml += `
        <div class="habit-card card ${isComplete ? 'is-completed' : ''}" id="card-${habit.id}" style="border-left: 4px solid ${habit.color};">
          <div class="habit-card-top">
            <div class="habit-info">
              <span class="habit-icon" style="background: ${habit.color}22; color: ${habit.color};">${habit.icon}</span>
              <div>
                <h4 class="habit-name">${Utils.escapeHtml(habit.name)}</h4>
                <div class="habit-meta-line">
                  <span class="habit-target-spec">
                    ${habit.type === 'boolean' ? 'YES/NO' : target + ' ' + habit.unit}
                  </span>
                  ${statusBadge}
                </div>
              </div>
            </div>

            <div class="streak-badge ${streaks.currentStreak > 0 ? 'active' : ''}">
              <span>🔥 ${streaks.currentStreak}D</span>
            </div>
          </div>

          ${isDmt ? `
            <div class="dmt-warning-banner">
              <span class="dmt-icon">⚠</span>
              <span class="dmt-text">DON'T MISS TWICE</span>
              <span class="dmt-sub">Target missed on previous scheduled day. Hold the standard today.</span>
            </div>
          ` : ''}

          <!-- Progress Bar -->
          <div class="habit-progress-line">
            <div class="habit-bar-track">
              <div class="habit-bar-fill" style="width: ${Math.min(100, pct)}%; background-color: ${habit.color};"></div>
            </div>
            <span class="habit-bar-pct">${pct}%</span>
          </div>

          <!-- Controls by Type -->
          <div class="habit-action-area">
            ${renderHabitInputControls(habit, entry, todayKey)}
          </div>

          <!-- Subhabits Checklist -->
          ${renderSubhabitsList(habit, entry, todayKey)}

          <!-- Habit Quick Note Input -->
          <div class="habit-note-area">
            <input type="text" 
                   class="input-note" 
                   placeholder="Add reflection for this habit..." 
                   value="${Utils.escapeHtml(entry ? entry.notes || '' : '')}"
                   onchange="UI.handleHabitNoteChange('${habit.id}', '${todayKey}', this.value)" />
          </div>
        </div>
      `;
    }

    if (scheduledCount === 0) {
      container.innerHTML = `
        <div class="empty-state-card card">
          <div class="empty-icon">🛡️</div>
          <h3>STANDBY DAY</h3>
          <p>No active habits are scheduled for today (${Utils.formatDisplayDate(todayKey)}). Enjoy your recovery or review your operational history.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = cardsHtml;

    // Load overall daily reflection note
    const reflectionText = await Entries.getDailyReflection(todayKey);
    const dailyNoteInput = document.getElementById('today-daily-journal-input');
    if (dailyNoteInput) {
      dailyNoteInput.value = reflectionText;
    }
  }

  function renderHabitInputControls(habit, entry, dateKey) {
    const val = entry ? entry.value : 0;
    const isComplete = entry ? Boolean(entry.completed) : false;

    if (habit.type === 'boolean') {
      return `
        <div class="boolean-controls">
          <button class="btn-toggle ${isComplete ? 'active-yes' : ''}" 
                  onclick="UI.updateHabitValue('${habit.id}', '${dateKey}', ${isComplete ? 0 : 1})">
            ${isComplete ? '✓ MISSION ACCOMPLISHED (YES)' : 'EXECUTE MISSION (MARK YES)'}
          </button>
        </div>
      `;
    }

    if (habit.type === 'numeric') {
      return `
        <div class="numeric-controls">
          <div class="value-stepper">
            <button class="btn-step" onclick="UI.stepHabitValue('${habit.id}', '${dateKey}', -1)">-1</button>
            <input type="number" 
                   class="input-actual" 
                   min="0" 
                   value="${val}" 
                   onchange="UI.updateHabitValue('${habit.id}', '${dateKey}', this.value)" />
            <span class="unit-label">${Utils.escapeHtml(habit.unit)}</span>
            <button class="btn-step" onclick="UI.stepHabitValue('${habit.id}', '${dateKey}', 1)">+1</button>
            <button class="btn-step" onclick="UI.stepHabitValue('${habit.id}', '${dateKey}', 5)">+5</button>
          </div>
          <button class="btn btn-sm ${isComplete ? 'btn-complete-ready' : 'btn-outline'}" 
                  onclick="UI.updateHabitValue('${habit.id}', '${dateKey}', ${habit.target})">
            ${isComplete ? 'TARGET MET' : 'SET TARGET (' + habit.target + ')'}
          </button>
        </div>
      `;
    }

    if (habit.type === 'duration') {
      return `
        <div class="duration-controls">
          <div class="value-stepper">
            <button class="btn-step" onclick="UI.stepHabitValue('${habit.id}', '${dateKey}', -5)">-5m</button>
            <input type="number" 
                   class="input-actual" 
                   min="0" 
                   value="${val}" 
                   onchange="UI.updateHabitValue('${habit.id}', '${dateKey}', this.value)" />
            <span class="unit-label">mins</span>
            <button class="btn-step" onclick="UI.stepHabitValue('${habit.id}', '${dateKey}', 5)">+5m</button>
            <button class="btn-step" onclick="UI.stepHabitValue('${habit.id}', '${dateKey}', 15)">+15m</button>
          </div>
          <button class="btn btn-sm ${isComplete ? 'btn-complete-ready' : 'btn-outline'}" 
                  onclick="UI.updateHabitValue('${habit.id}', '${dateKey}', ${habit.target})">
            ${isComplete ? 'TARGET MET' : 'SET TARGET (' + habit.target + 'm)'}
          </button>
        </div>
      `;
    }

    return '';
  }

  function renderSubhabitsList(habit, entry, dateKey) {
    if (!habit.subhabits || habit.subhabits.length === 0) return '';

    const subMap = (entry && entry.subhabits) || {};

    let list = `<div class="subhabits-checklist">
      <span class="subhabits-title">SUB-HABIT COMPONENTS</span>
      <div class="subhabits-grid">`;

    for (const sh of habit.subhabits) {
      const isChecked = Boolean(subMap[sh]);
      list += `
        <label class="subhabit-item ${isChecked ? 'done' : ''}">
          <input type="checkbox" 
                 ${isChecked ? 'checked' : ''} 
                 onchange="UI.handleSubhabitToggle('${habit.id}', '${dateKey}', '${Utils.escapeHtml(sh)}', this.checked)" />
          <span>${Utils.escapeHtml(sh)}</span>
        </label>
      `;
    }

    list += `</div></div>`;
    return list;
  }

  /* ==========================================================================
     HISTORY SCREEN & HEATMAP
     ========================================================================== */
  async function renderHistoryScreen() {
    const heatmapContainer = document.getElementById('history-heatmap-container');
    const historyListContainer = document.getElementById('history-entries-list');
    const habitFilterSelect = document.getElementById('history-habit-filter');

    const allHabits = await Habits.getAll();
    const activeHabits = allHabits.filter(h => !h.archived);

    // Populate habit selector if not already done
    if (habitFilterSelect) {
      const currentSelected = habitFilterSelect.value || 'all';
      habitFilterSelect.innerHTML = `<option value="all">ALL HABITS</option>` +
        allHabits.map(h => `<option value="${h.id}" ${h.id === currentSelected ? 'selected' : ''}>${h.icon} ${Utils.escapeHtml(h.name)}</option>`).join('');
      habitFilterSelect.onchange = (e) => {
        historyHabitFilter = e.target.value;
        renderHistoryScreen();
      };
    }

    // 1. Render Contribution Heatmap
    if (heatmapContainer) {
      const heatmapDays = await Analytics.generateHeatmapData(activeHabits, Utils.getTodayDateKey(), 182); // 26 weeks
      let hmHtml = `
        <div class="heatmap-card card">
          <div class="card-header">
            <span class="card-tag">DISCIPLINE HEATMAP (26 WEEKS)</span>
            <div class="heatmap-legend">
              <span class="legend-box level-0"></span><span class="legend-lbl">0%</span>
              <span class="legend-box level-1"></span>
              <span class="legend-box level-2"></span>
              <span class="legend-box level-3"></span>
              <span class="legend-box level-4"></span><span class="legend-lbl">100%</span>
            </div>
          </div>
          <div class="heatmap-scroll-area">
            <div class="heatmap-grid">
      `;

      for (const d of heatmapDays) {
        const title = `${d.date}: ${d.completed}/${d.scheduled} Completed (Level ${d.level})`;
        hmHtml += `
          <div class="heatmap-cell level-${d.level}" 
               title="${title}" 
               data-date="${d.date}"
               onclick="UI.openDayDetailsModal('${d.date}')">
          </div>
        `;
      }

      hmHtml += `
            </div>
          </div>
          <p class="heatmap-hint">Click any square to inspect and edit entries for that day.</p>
        </div>
      `;
      heatmapContainer.innerHTML = hmHtml;
    }

    // 2. Render Historical Entries Table/List based on active filter
    if (historyListContainer) {
      let daysBack = 30;
      if (historyFilter === '7') daysBack = 7;
      else if (historyFilter === '30') daysBack = 30;
      else if (historyFilter === '90') daysBack = 90;
      else if (historyFilter === '365') daysBack = 365;
      else if (historyFilter === 'all') daysBack = 365 * 10;

      const today = Utils.getTodayDateKey();
      const cutoffDate = Utils.addDays(today, -daysBack);

      let allEntries = await DB.getAll('entries');
      allEntries = allEntries.filter(e => e.date >= cutoffDate && e.date <= today);

      if (historyHabitFilter !== 'all') {
        allEntries = allEntries.filter(e => e.habitId === historyHabitFilter);
      }

      allEntries.sort((a, b) => b.date.localeCompare(a.date));

      const habitMap = new Map(allHabits.map(h => [h.id, h]));

      if (allEntries.length === 0) {
        historyListContainer.innerHTML = `
          <div class="empty-state-card card">
            <p>No recorded entries found in this timeframe.</p>
          </div>
        `;
        return;
      }

      let entriesHtml = `
        <div class="history-table-container card">
          <table class="data-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>HABIT</th>
                <th>VALUE / TARGET</th>
                <th>ACHIEVEMENT</th>
                <th>STATUS</th>
                <th>NOTES</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const e of allEntries) {
        const h = habitMap.get(e.habitId) || { name: 'Unknown Habit', icon: '🎯', color: '#94a3b8', type: e.habitType };
        entriesHtml += `
          <tr>
            <td><strong>${e.date}</strong></td>
            <td>
              <div class="table-habit-cell">
                <span style="color: ${h.color}; margin-right: 6px;">${h.icon}</span>
                <span>${Utils.escapeHtml(h.name)}</span>
              </div>
            </td>
            <td>${e.value} / ${e.target} ${e.unit || ''}</td>
            <td><strong>${e.percentage}%</strong></td>
            <td>
              <span class="badge ${e.completed ? 'badge-complete' : (e.percentage >= 50 ? 'badge-partial' : 'badge-low')}">
                ${e.status}
              </span>
            </td>
            <td class="cell-notes">${Utils.escapeHtml(e.notes || '-')}</td>
            <td>
              <button class="btn btn-xs btn-outline" onclick="UI.openEditEntryModal('${e.habitId}', '${e.date}')">EDIT</button>
            </td>
          </tr>
        `;
      }

      entriesHtml += `
            </tbody>
          </table>
        </div>
      `;

      historyListContainer.innerHTML = entriesHtml;
    }
  }

  function setHistoryFilter(filterVal) {
    historyFilter = filterVal;
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filterVal);
    });
    renderHistoryScreen();
  }

  /* ==========================================================================
     HABITS MANAGEMENT SCREEN
     ========================================================================== */
  async function renderHabitsScreen() {
    const activeList = document.getElementById('habits-active-list');
    const archivedList = document.getElementById('habits-archived-list');
    const countBadge = document.getElementById('habits-count-badge');

    const active = await Habits.getActive();
    const archived = await Habits.getArchived();

    if (countBadge) {
      countBadge.textContent = `${active.length} / ${Habits.MAX_ACTIVE_HABITS} ACTIVE`;
      countBadge.className = `badge ${active.length >= Habits.MAX_ACTIVE_HABITS ? 'badge-danger' : 'badge-gold'}`;
    }

    if (activeList) {
      if (active.length === 0) {
        activeList.innerHTML = `<div class="empty-state-card card"><p>No active habits. Create one to begin.</p></div>`;
      } else {
        let html = '';
        for (const h of active) {
          const streaks = await Streaks.calculateHabitStreaks(h);
          html += `
            <div class="card habit-manager-card" style="border-left: 4px solid ${h.color};">
              <div class="habit-manager-main">
                <div class="habit-manager-header">
                  <span class="habit-icon" style="background: ${h.color}22; color: ${h.color};">${h.icon}</span>
                  <div>
                    <h4 class="habit-title">${Utils.escapeHtml(h.name)}</h4>
                    <p class="habit-description">${Utils.escapeHtml(h.description || 'No description provided.')}</p>
                    <div class="habit-specs">
                      <span class="type-pill ${h.type}">${h.type.toUpperCase()}</span>
                      <span class="spec-item">🎯 ${h.target} ${h.unit}</span>
                      <span class="spec-item">🗓️ ${h.frequency ? (h.frequency.type === 'daily' ? 'Daily' : 'Selected Days') : 'Daily'}</span>
                    </div>
                  </div>
                </div>

                <div class="habit-manager-stats">
                  <div class="stat-mini">
                    <span class="stat-mini-val">🔥 ${streaks.currentStreak}d</span>
                    <span class="stat-mini-lbl">CURRENT</span>
                  </div>
                  <div class="stat-mini">
                    <span class="stat-mini-val">⭐ ${streaks.longestStreak}d</span>
                    <span class="stat-mini-lbl">LONGEST</span>
                  </div>
                  <div class="stat-mini">
                    <span class="stat-mini-val">${streaks.completionRate}%</span>
                    <span class="stat-mini-lbl">RATE</span>
                  </div>
                </div>
              </div>

              <div class="habit-manager-actions">
                <button class="btn btn-sm btn-outline" onclick="UI.openHabitModal('${h.id}')">EDIT</button>
                <button class="btn btn-sm btn-outline" onclick="UI.confirmArchiveHabit('${h.id}')">ARCHIVE</button>
                <button class="btn btn-sm btn-danger" onclick="UI.confirmDeleteHabit('${h.id}')">DELETE</button>
              </div>
            </div>
          `;
        }
        activeList.innerHTML = html;
      }
    }

    if (archivedList) {
      if (archived.length === 0) {
        archivedList.innerHTML = `<p class="empty-subtle">No archived habits.</p>`;
      } else {
        let html = '';
        for (const h of archived) {
          html += `
            <div class="card habit-manager-card archived-card">
              <div class="habit-manager-main">
                <div class="habit-manager-header">
                  <span class="habit-icon opacity-muted">${h.icon}</span>
                  <div>
                    <h4 class="habit-title">${Utils.escapeHtml(h.name)} (ARCHIVED)</h4>
                    <span class="spec-item">Target: ${h.target} ${h.unit}</span>
                  </div>
                </div>
              </div>
              <div class="habit-manager-actions">
                <button class="btn btn-sm btn-primary" onclick="UI.unarchiveHabit('${h.id}')">RESTORE MISSION</button>
                <button class="btn btn-sm btn-danger" onclick="UI.confirmDeleteHabit('${h.id}')">PERMANENT DELETE</button>
              </div>
            </div>
          `;
        }
        archivedList.innerHTML = html;
      }
    }
  }

  /* ==========================================================================
     SETTINGS SCREEN
     ========================================================================== */
  async function renderSettingsScreen() {
    const themeSelect = document.getElementById('settings-theme-select');
    if (themeSelect) {
      const savedTheme = localStorage.getItem('grind_theme') || 'dark';
      themeSelect.value = savedTheme;
    }

    const lastBackupEl = document.getElementById('settings-last-backup');
    if (lastBackupEl) {
      const meta = await DB.get('metadata', 'last_backup_date');
      lastBackupEl.textContent = meta ? Utils.formatShortDate(meta.value.substring(0, 10)) : 'Never';
    }
  }

  /* ==========================================================================
     ACTION HANDLERS (VALUE UPDATES, SUBHABITS, NOTES)
     ========================================================================== */
  async function updateHabitValue(habitId, dateKey, newValue) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    await Entries.saveEntry(habit, dateKey, newValue);
    await refreshCurrentScreen();
  }

  async function stepHabitValue(habitId, dateKey, delta) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    const existing = await Entries.getEntry(habitId, dateKey);
    const cur = existing ? Number(existing.value) || 0 : 0;
    const updated = Math.max(0, cur + delta);

    await Entries.saveEntry(habit, dateKey, updated);
    await refreshCurrentScreen();
  }

  async function handleSubhabitToggle(habitId, dateKey, subhabitName, isChecked) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    await Entries.updateSubhabit(habit, dateKey, subhabitName, isChecked);
    await refreshCurrentScreen();
  }

  async function handleHabitNoteChange(habitId, dateKey, notes) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    await Entries.updateEntryNotes(habit, dateKey, notes);
    Utils.showToast('Habit note saved', 'info', 1500);
  }

  async function saveDailyReflection() {
    const input = document.getElementById('today-daily-journal-input');
    if (!input) return;
    const text = input.value;
    const today = Utils.getTodayDateKey();
    await Entries.saveDailyReflection(today, text);
    Utils.showToast('Daily mission reflection saved.', 'success');
  }

  /* ==========================================================================
     MODALS (HABIT FORM, EDIT ENTRY, CONFIRMATIONS)
     ========================================================================== */
  let currentEditingHabitId = null;

  async function openHabitModal(habitId = null) {
    currentEditingHabitId = habitId;
    const modal = document.getElementById('habit-modal');
    const modalTitle = document.getElementById('habit-modal-title');
    const nameInput = document.getElementById('modal-habit-name');
    const descInput = document.getElementById('modal-habit-desc');
    const typeSelect = document.getElementById('modal-habit-type');
    const targetInput = document.getElementById('modal-habit-target');
    const unitInput = document.getElementById('modal-habit-unit');
    const freqDaily = document.getElementById('modal-freq-daily');
    const freqWeekdays = document.getElementById('modal-freq-weekdays');
    const weekdaysBox = document.getElementById('modal-weekdays-picker');
    const subhabitsBox = document.getElementById('modal-subhabits-list');
    const iconSelectedSpan = document.getElementById('modal-selected-icon');
    const colorSelectedInput = document.getElementById('modal-habit-color');

    let habit = null;
    if (habitId) {
      habit = await Habits.getById(habitId);
      if (modalTitle) modalTitle.textContent = 'EDIT OPERATIONAL HABIT';
    } else {
      if (modalTitle) modalTitle.textContent = 'CONFIGURE NEW HABIT';
    }

    // Set values
    if (nameInput) nameInput.value = habit ? habit.name : '';
    if (descInput) descInput.value = habit ? habit.description || '' : '';
    if (typeSelect) {
      typeSelect.value = habit ? habit.type : 'boolean';
      typeSelect.disabled = Boolean(habit); // Keep type stable for existing habit
      toggleHabitTypeInputs(typeSelect.value);
    }
    if (targetInput) targetInput.value = habit ? habit.target : '1';
    if (unitInput) unitInput.value = habit ? habit.unit : '';

    if (iconSelectedSpan) iconSelectedSpan.textContent = habit ? habit.icon : '🏋️';
    if (colorSelectedInput) colorSelectedInput.value = habit ? habit.color : COLORS[0];

    // Frequency
    const isDaily = !habit || !habit.frequency || habit.frequency.type === 'daily';
    if (freqDaily) freqDaily.checked = isDaily;
    if (freqWeekdays) freqWeekdays.checked = !isDaily;
    if (weekdaysBox) weekdaysBox.style.display = isDaily ? 'none' : 'flex';

    const selectedDays = habit && habit.frequency && Array.isArray(habit.frequency.days) 
      ? habit.frequency.days 
      : [1, 2, 3, 4, 5]; // default Mon-Fri

    for (let i = 0; i <= 6; i++) {
      const cb = document.getElementById(`modal-day-${i}`);
      if (cb) cb.checked = selectedDays.includes(i);
    }

    // Subhabits
    if (subhabitsBox) {
      subhabitsBox.innerHTML = '';
      const subs = (habit && habit.subhabits) || [];
      subs.forEach(s => addSubhabitInputRow(s));
    }

    modal.classList.add('active');
  }

  function toggleHabitTypeInputs(type) {
    const targetGroup = document.getElementById('modal-target-group');
    const unitGroup = document.getElementById('modal-unit-group');
    const targetInput = document.getElementById('modal-habit-target');
    const unitInput = document.getElementById('modal-habit-unit');

    if (type === 'boolean') {
      if (targetGroup) targetGroup.style.display = 'none';
      if (unitGroup) unitGroup.style.display = 'none';
    } else if (type === 'duration') {
      if (targetGroup) targetGroup.style.display = 'block';
      if (unitGroup) unitGroup.style.display = 'none';
      if (targetInput && (!targetInput.value || targetInput.value === '1')) targetInput.value = '45';
      if (unitInput) unitInput.value = 'mins';
    } else { // numeric
      if (targetGroup) targetGroup.style.display = 'block';
      if (unitGroup) unitGroup.style.display = 'block';
      if (targetInput && (!targetInput.value || targetInput.value === '1')) targetInput.value = '30';
      if (unitInput && !unitInput.value) unitInput.value = 'pages';
    }
  }

  function addSubhabitInputRow(value = '') {
    const list = document.getElementById('modal-subhabits-list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'subhabit-input-row';
    row.innerHTML = `
      <input type="text" class="input-text subhabit-val" placeholder="Component checklist step..." value="${Utils.escapeHtml(value)}" />
      <button type="button" class="btn btn-sm btn-icon-del" onclick="this.parentElement.remove()">✕</button>
    `;
    list.appendChild(row);
  }

  async function saveHabitFromModal() {
    const nameInput = document.getElementById('modal-habit-name');
    const descInput = document.getElementById('modal-habit-desc');
    const typeSelect = document.getElementById('modal-habit-type');
    const targetInput = document.getElementById('modal-habit-target');
    const unitInput = document.getElementById('modal-habit-unit');
    const freqDaily = document.getElementById('modal-freq-daily');
    const iconSelectedSpan = document.getElementById('modal-selected-icon');
    const colorSelectedInput = document.getElementById('modal-habit-color');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      Utils.showToast('Habit name cannot be empty', 'error');
      return;
    }

    const type = typeSelect ? typeSelect.value : 'boolean';
    const description = descInput ? descInput.value.trim() : '';
    const icon = iconSelectedSpan ? iconSelectedSpan.textContent.trim() : '🎯';
    const color = colorSelectedInput ? colorSelectedInput.value : COLORS[0];

    let target = 1;
    let unit = 'completion';

    if (type === 'numeric') {
      target = Number(targetInput.value) || 1;
      unit = unitInput ? unitInput.value.trim() : 'units';
    } else if (type === 'duration') {
      target = Number(targetInput.value) || 30;
      unit = 'mins';
    }

    const frequencyType = freqDaily && freqDaily.checked ? 'daily' : 'weekdays';
    const days = [];
    if (frequencyType === 'weekdays') {
      for (let i = 0; i <= 6; i++) {
        const cb = document.getElementById(`modal-day-${i}`);
        if (cb && cb.checked) days.push(i);
      }
      if (days.length === 0) {
        Utils.showToast('Please select at least one day for weekly frequency', 'error');
        return;
      }
    }

    const subInputs = document.querySelectorAll('.subhabit-val');
    const subhabits = Array.from(subInputs)
      .map(i => i.value.trim())
      .filter(s => s.length > 0);

    const habitPayload = {
      name,
      description,
      type,
      target,
      unit,
      icon,
      color,
      frequency: {
        type: frequencyType,
        days: frequencyType === 'weekdays' ? days : undefined
      },
      subhabits
    };

    try {
      if (currentEditingHabitId) {
        await Habits.update(currentEditingHabitId, habitPayload);
        Utils.showToast('Habit updated successfully.', 'success');
      } else {
        await Habits.add(habitPayload);
        Utils.showToast('New mission habit configured.', 'success');
      }
      closeModal('habit-modal');
      await refreshCurrentScreen();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  /* Confirm Archive vs Permanent Delete */
  async function confirmArchiveHabit(habitId) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    if (confirm(`Archive habit "${habit.name}"?\n\nHistorical records will be preserved, but this habit will be removed from your daily mission board.`)) {
      await Habits.archive(habitId);
      Utils.showToast(`Habit "${habit.name}" archived.`, 'info');
      await refreshCurrentScreen();
    }
  }

  async function unarchiveHabit(habitId) {
    try {
      await Habits.unarchive(habitId);
      Utils.showToast('Habit restored to active duty.', 'success');
      await refreshCurrentScreen();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  }

  async function confirmDeleteHabit(habitId) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    const msg = `WARNING: Are you sure you want to PERMANENTLY DELETE "${habit.name}"?\n\nThis will remove all historical entries and streaks for this habit. This action CANNOT be undone.\n\nPrefer ARCHIVING if you wish to keep your records.`;
    if (confirm(msg)) {
      await Habits.deletePermanently(habitId);
      Utils.showToast(`Habit "${habit.name}" permanently deleted.`, 'info');
      await refreshCurrentScreen();
    }
  }

  /* Edit Historical Entry Modal */
  async function openEditEntryModal(habitId, dateKey) {
    const habit = await Habits.getById(habitId);
    const entry = await Entries.getEntry(habitId, dateKey);
    if (!habit) return;

    const modal = document.getElementById('entry-edit-modal');
    const titleEl = document.getElementById('entry-edit-title');
    const contentEl = document.getElementById('entry-edit-content');

    if (titleEl) {
      titleEl.textContent = `EDIT RECORD: ${habit.name} (${dateKey})`;
    }

    const currentVal = entry ? entry.value : 0;
    const currentTarget = entry ? entry.target : habit.target;
    const currentNotes = entry ? entry.notes || '' : '';

    let formHtml = `
      <div class="form-group">
        <label>Historical Target Snapshot (${habit.unit || 'units'})</label>
        <input type="number" id="entry-edit-target" class="input-text" value="${currentTarget}" min="1" />
        <span class="form-hint">Preserves historical accuracy if targets changed over time.</span>
      </div>

      <div class="form-group">
        <label>Actual Recorded Value</label>
        ${habit.type === 'boolean' ? `
          <select id="entry-edit-value" class="input-text">
            <option value="1" ${currentVal ? 'selected' : ''}>YES (100% Complete)</option>
            <option value="0" ${!currentVal ? 'selected' : ''}>NO (Incomplete)</option>
          </select>
        ` : `
          <input type="number" id="entry-edit-value" class="input-text" value="${currentVal}" min="0" />
        `}
      </div>

      <div class="form-group">
        <label>Daily Journal / Notes</label>
        <textarea id="entry-edit-notes" class="input-text" rows="3">${Utils.escapeHtml(currentNotes)}</textarea>
      </div>

      <div class="modal-actions">
        <button class="btn btn-outline" onclick="UI.closeModal('entry-edit-modal')">CANCEL</button>
        <button class="btn btn-primary" onclick="UI.saveHistoricalEntry('${habit.id}', '${dateKey}')">SAVE ENTRY</button>
      </div>
    `;

    if (contentEl) contentEl.innerHTML = formHtml;
    if (modal) modal.classList.add('active');
  }

  async function saveHistoricalEntry(habitId, dateKey) {
    const habit = await Habits.getById(habitId);
    if (!habit) return;

    const targetInput = document.getElementById('entry-edit-target');
    const valInput = document.getElementById('entry-edit-value');
    const notesInput = document.getElementById('entry-edit-notes');

    const newTarget = targetInput ? Number(targetInput.value) || habit.target : habit.target;
    const newVal = valInput ? (habit.type === 'boolean' ? Number(valInput.value) : Number(valInput.value)) : 0;
    const newNotes = notesInput ? notesInput.value.trim() : '';

    await Entries.saveEntry(habit, dateKey, newVal, null, newNotes, newTarget);
    Utils.showToast('Historical entry updated', 'success');
    closeModal('entry-edit-modal');
    await refreshCurrentScreen();
  }

  /* Day Details Modal (from Heatmap click) */
  async function openDayDetailsModal(dateKey) {
    const modal = document.getElementById('day-details-modal');
    const title = document.getElementById('day-details-title');
    const body = document.getElementById('day-details-body');

    if (title) title.textContent = `MISSION LOG: ${Utils.formatDisplayDate(dateKey)}`;

    const allHabits = await Habits.getAll();
    const habitMap = new Map(allHabits.map(h => [h.id, h]));
    const entries = await Entries.getEntriesForDate(dateKey);
    const entryMap = new Map(entries.map(e => [e.habitId, e]));

    const scheduledHabits = allHabits.filter(h => !h.archived && Utils.isHabitScheduled(h, dateKey));
    const dayNote = await Entries.getDailyReflection(dateKey);

    let html = `
      ${dayNote ? `
        <div class="day-log-note card">
          <strong>Daily Reflection:</strong>
          <p>${Utils.escapeHtml(dayNote)}</p>
        </div>
      ` : ''}
      <div class="day-details-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>HABIT</th>
              <th>RESULT</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (scheduledHabits.length === 0) {
      html += `<tr><td colspan="4" class="empty-state">No habits were scheduled for this date.</td></tr>`;
    } else {
      for (const h of scheduledHabits) {
        const e = entryMap.get(h.id);
        const val = e ? e.value : 0;
        const target = e ? e.target : h.target;
        const pct = e ? e.percentage : 0;
        const isComplete = e ? e.completed : false;

        html += `
          <tr>
            <td>
              <span style="color: ${h.color}; margin-right: 6px;">${h.icon}</span>
              <strong>${Utils.escapeHtml(h.name)}</strong>
            </td>
            <td>${val} / ${target} ${h.unit || ''} (${pct}%)</td>
            <td>
              <span class="badge ${isComplete ? 'badge-complete' : (pct >= 50 ? 'badge-partial' : 'badge-low')}">
                ${e ? e.status : 'MISSED'}
              </span>
            </td>
            <td>
              <button class="btn btn-xs btn-outline" onclick="UI.closeModal('day-details-modal'); UI.openEditEntryModal('${h.id}', '${dateKey}')">EDIT</button>
            </td>
          </tr>
        `;
      }
    }

    html += `
          </tbody>
        </table>
      </div>
      <div class="modal-actions" style="margin-top: 1rem;">
        <button class="btn btn-outline" onclick="UI.closeModal('day-details-modal')">CLOSE</button>
      </div>
    `;

    if (body) body.innerHTML = html;
    if (modal) modal.classList.add('active');
  }

  /* Reset Application Data with Safety Confirmation */
  async function resetApplicationData() {
    const backupFirst = confirm("DATA SAFETY CHECK:\n\nDo you want to download an EXPORT BACKUP before clearing your application data?");
    if (backupFirst) {
      await Backup.exportBackupJSON();
    }

    const doubleCheck = prompt('FINAL CONFIRMATION:\n\nType "RESET" to permanently wipe all habits, historical entries, and settings:');
    if (doubleCheck === 'RESET') {
      await DB.clearAllData();
      Utils.showToast('All application data has been wiped.', 'info');
      await refreshCurrentScreen();
    } else {
      Utils.showToast('Reset cancelled.', 'info');
    }
  }

  function handleBackupFileSelect(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const jsonContent = e.target.result;
      const proceed = confirm("CONFIRM RESTORATION:\n\nImporting a backup will replace existing data in your local database. Do you wish to continue?");
      if (!proceed) return;

      try {
        const res = await Backup.restoreFromJSON(jsonContent);
        Utils.showToast(`Restored ${res.habitsCount} habits and ${res.entriesCount} entries successfully.`, 'success');
        await refreshCurrentScreen();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    };

    reader.readAsText(file);
    input.value = ''; // reset
  }

  return {
    initNavigation,
    switchTab,
    refreshCurrentScreen,
    renderTodayScreen,
    renderHistoryScreen,
    renderHabitsScreen,
    renderSettingsScreen,
    setHistoryFilter,
    updateHabitValue,
    stepHabitValue,
    handleSubhabitToggle,
    handleHabitNoteChange,
    saveDailyReflection,
    openHabitModal,
    saveHabitFromModal,
    closeModal,
    confirmArchiveHabit,
    unarchiveHabit,
    confirmDeleteHabit,
    openEditEntryModal,
    saveHistoricalEntry,
    openDayDetailsModal,
    resetApplicationData,
    handleBackupFileSelect,
    toggleHabitTypeInputs,
    addSubhabitInputRow
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}
