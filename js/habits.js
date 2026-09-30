/**
 * PROJECT GRIND & SHINE
 * Habit Management & CRUD Operations
 * Enforces active limit of 20 habits, validation, and historical integrity.
 */

const Habits = (() => {
  const MAX_ACTIVE_HABITS = 20;

  const DEFAULT_ICONS = [
    '🏋️', '📚', '🎸', '🧘', '🏃', '💧', '🛌', '🧠', 
    '💼', '💻', '📝', '🎯', '🔥', '❤️', '🌅', '🚶', 
    '🥗', '🧹', '💰', '⭐'
  ];

  const PRESET_COLORS = [
    '#f59e0b', // Tactical Gold / Amber (Primary accent)
    '#10b981', // Mission Emerald
    '#3b82f6', // Operations Blue
    '#ef4444', // Combat Crimson
    '#06b6d4', // Recon Cyan
    '#8b5cf6', // Deep Violet
    '#f97316', // Hazard Orange
    '#84cc16', // Field Green
    '#ec4899', // Signal Pink
    '#94a3b8'  // Steel Slate
  ];

  function validateHabitData(data, isEdit = false, currentActiveCount = 0) {
    const errors = [];

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.push('Habit name is required.');
    } else if (data.name.trim().length > 100) {
      errors.push('Habit name cannot exceed 100 characters.');
    }

    const validTypes = ['boolean', 'numeric', 'duration'];
    if (!validTypes.includes(data.type)) {
      errors.push('Invalid habit type. Must be boolean, numeric, or duration.');
    }

    if (data.type === 'numeric' || data.type === 'duration') {
      const target = Number(data.target);
      if (isNaN(target) || target <= 0) {
        errors.push(`Target value must be a positive number for ${data.type} habit.`);
      }
    }

    if (data.type === 'numeric' && (!data.unit || !data.unit.trim())) {
      errors.push('Unit is required for numeric habits (e.g. pages, reps).');
    }

    if (data.frequency) {
      if (data.frequency.type === 'weekdays') {
        if (!Array.isArray(data.frequency.days) || data.frequency.days.length === 0) {
          errors.push('At least one day of the week must be selected.');
        }
      }
    }

    if (!isEdit && currentActiveCount >= MAX_ACTIVE_HABITS) {
      errors.push(`Maximum of ${MAX_ACTIVE_HABITS} active habits reached. Archive an existing habit first.`);
    }

    return errors;
  }

  return {
    MAX_ACTIVE_HABITS,
    DEFAULT_ICONS,
    PRESET_COLORS,

    async getAll() {
      return DB.getAll('habits');
    },

    async getActive() {
      const all = await this.getAll();
      return all
        .filter(h => !h.archived)
        .sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt.localeCompare(b.createdAt));
    },

    async getArchived() {
      const all = await this.getAll();
      return all
        .filter(h => h.archived)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async getById(id) {
      return DB.get('habits', id);
    },

    async getActiveCount() {
      const active = await this.getActive();
      return active.length;
    },

    async add(habitData) {
      const activeCount = await this.getActiveCount();
      const validationErrors = validateHabitData(habitData, false, activeCount);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '));
      }

      const id = Utils.generateId('habit');
      const now = new Date().toISOString();

      let target = Number(habitData.target) || 1;
      let unit = habitData.unit ? habitData.unit.trim() : '';

      if (habitData.type === 'boolean') {
        target = 1;
        unit = 'completion';
      } else if (habitData.type === 'duration') {
        unit = 'mins';
      }

      // Clean subhabits
      let subhabits = [];
      if (Array.isArray(habitData.subhabits)) {
        subhabits = habitData.subhabits
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(s => s.length > 0);
      }

      const habit = {
        id,
        name: habitData.name.trim(),
        icon: habitData.icon || '🎯',
        color: habitData.color || PRESET_COLORS[0],
        description: (habitData.description || '').trim(),
        type: habitData.type,
        target,
        unit,
        frequency: habitData.frequency || { type: 'daily' },
        startDate: habitData.startDate || Utils.getTodayDateKey(),
        subhabits,
        archived: false,
        order: activeCount + 1,
        createdAt: now,
        updatedAt: now
      };

      await DB.put('habits', habit);
      return habit;
    },

    async update(id, updates) {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error('Habit not found');
      }

      const candidate = { ...existing, ...updates };
      const validationErrors = validateHabitData(candidate, true);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(' '));
      }

      // Format target & unit
      let target = candidate.target;
      let unit = candidate.unit;
      if (candidate.type === 'boolean') {
        target = 1;
        unit = 'completion';
      } else {
        target = Number(candidate.target) || 1;
        if (candidate.type === 'duration') unit = 'mins';
      }

      // Clean subhabits
      let subhabits = [];
      if (Array.isArray(candidate.subhabits)) {
        subhabits = candidate.subhabits
          .map(s => (typeof s === 'string' ? s.trim() : ''))
          .filter(s => s.length > 0);
      }

      const updated = {
        ...existing,
        name: candidate.name.trim(),
        icon: candidate.icon || existing.icon,
        color: candidate.color || existing.color,
        description: (candidate.description || '').trim(),
        type: candidate.type,
        target,
        unit,
        frequency: candidate.frequency || existing.frequency,
        startDate: candidate.startDate || existing.startDate,
        subhabits,
        updatedAt: new Date().toISOString()
      };

      await DB.put('habits', updated);
      return updated;
    },

    async archive(id) {
      const habit = await this.getById(id);
      if (!habit) throw new Error('Habit not found');
      habit.archived = true;
      habit.updatedAt = new Date().toISOString();
      await DB.put('habits', habit);
      return habit;
    },

    async unarchive(id) {
      const activeCount = await this.getActiveCount();
      if (activeCount >= MAX_ACTIVE_HABITS) {
        throw new Error(`Cannot restore habit. Maximum of ${MAX_ACTIVE_HABITS} active habits already reached.`);
      }
      const habit = await this.getById(id);
      if (!habit) throw new Error('Habit not found');
      habit.archived = false;
      habit.updatedAt = new Date().toISOString();
      await DB.put('habits', habit);
      return habit;
    },

    async deletePermanently(id) {
      // 1. Remove habit
      await DB.delete('habits', id);
      // 2. Remove all related entries to maintain database integrity
      const entries = await DB.getAllByIndex('entries', 'habitId', id);
      for (const entry of entries) {
        await DB.delete('entries', entry.id);
      }
      return true;
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Habits;
}
