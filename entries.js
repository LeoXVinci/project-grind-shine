/**
 * PROJECT GRIND & SHINE
 * Daily Entries & Progress Tracking
 * Ensures historical integrity (preserves historical target snapshots).
 */

const Entries = (() => {
  function makeEntryId(habitId, dateKey) {
    return `${habitId}_${dateKey}`;
  }

  function evaluateEntry(habit, value, subhabits = {}, notes = '', existingTarget = null) {
    const isBool = habit.type === 'boolean';
    // Use existing historical target snapshot if present, otherwise current habit target
    const target = existingTarget !== null && existingTarget !== undefined ? Number(existingTarget) : Number(habit.target) || 1;
    const unit = habit.unit || (isBool ? 'completion' : '');

    let completed = false;
    let actualValue = 0;
    let percentage = 0;

    if (isBool) {
      completed = Boolean(value);
      actualValue = completed ? 1 : 0;
      percentage = completed ? 100 : 0;
    } else {
      actualValue = Math.max(0, Number(value) || 0);
      percentage = target > 0 ? Math.round((actualValue / target) * 100) : 0;
      completed = actualValue >= target;
    }

    let status = 'LOW';
    if (completed) {
      status = 'COMPLETE';
    } else if (percentage >= 50) {
      status = 'PARTIAL';
    } else if (actualValue > 0) {
      status = 'LOW';
    } else {
      status = 'MISSED';
    }

    return {
      actualValue,
      target,
      unit,
      completed,
      percentage,
      status,
      subhabits: subhabits || {},
      notes: (notes || '').trim()
    };
  }

  return {
    makeEntryId,

    async getEntry(habitId, dateKey) {
      const id = makeEntryId(habitId, dateKey);
      return DB.get('entries', id);
    },

    async getEntriesForDate(dateKey) {
      return DB.getAllByIndex('entries', 'date', dateKey);
    },

    async getEntriesForHabit(habitId) {
      const list = await DB.getAllByIndex('entries', 'habitId', habitId);
      return list.sort((a, b) => a.date.localeCompare(b.date));
    },

    async getAllEntries() {
      const list = await DB.getAll('entries');
      return list.sort((a, b) => a.date.localeCompare(b.date));
    },

    async saveEntry(habit, dateKey, value, subhabits = null, notes = null, overrideTarget = null) {
      const existing = await this.getEntry(habit.id, dateKey);

      // Preserve historical target if already stored, unless explicitly overridden
      const historicalTarget = overrideTarget !== null ? overrideTarget : (existing ? existing.target : habit.target);
      const activeSubhabits = subhabits !== null ? subhabits : (existing ? existing.subhabits : {});
      const activeNotes = notes !== null ? notes : (existing ? existing.notes : '');

      const evalData = evaluateEntry(habit, value, activeSubhabits, activeNotes, historicalTarget);

      const entry = {
        id: makeEntryId(habit.id, dateKey),
        habitId: habit.id,
        date: dateKey,
        habitType: habit.type,
        value: evalData.actualValue,
        target: evalData.target,
        unit: evalData.unit,
        completed: evalData.completed,
        percentage: evalData.percentage,
        status: evalData.status,
        subhabits: evalData.subhabits,
        notes: evalData.notes,
        timestamp: new Date().toISOString()
      };

      await DB.put('entries', entry);
      return entry;
    },

    async updateSubhabit(habit, dateKey, subhabitName, isChecked) {
      const existing = await this.getEntry(habit.id, dateKey);
      const subhabits = existing ? { ...(existing.subhabits || {}) } : {};
      subhabits[subhabitName] = Boolean(isChecked);

      const val = existing ? existing.value : 0;
      return this.saveEntry(habit, dateKey, val, subhabits, existing ? existing.notes : null);
    },

    async updateEntryNotes(habit, dateKey, notes) {
      const existing = await this.getEntry(habit.id, dateKey);
      const val = existing ? existing.value : 0;
      const subhabits = existing ? existing.subhabits : {};
      return this.saveEntry(habit, dateKey, val, subhabits, notes);
    },

    async deleteEntry(habitId, dateKey) {
      const id = makeEntryId(habitId, dateKey);
      return DB.delete('entries', id);
    },

    // Daily reflection note (overall date level)
    async getDailyReflection(dateKey) {
      const item = await DB.get('settings', `daily_reflection_${dateKey}`);
      return item ? item.value : '';
    },

    async saveDailyReflection(dateKey, text) {
      return DB.put('settings', {
        key: `daily_reflection_${dateKey}`,
        value: (text || '').trim(),
        date: dateKey,
        updatedAt: new Date().toISOString()
      });
    },

    async getAllDailyReflections() {
      const allSettings = await DB.getAll('settings');
      return allSettings
        .filter(s => s.key && s.key.startsWith('daily_reflection_'))
        .map(s => ({
          date: s.date || s.key.replace('daily_reflection_', ''),
          note: s.value,
          updatedAt: s.updatedAt
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Entries;
}
