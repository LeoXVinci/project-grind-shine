/**
 * PROJECT GRIND & SHINE
 * Core Utilities Module
 */

const Utils = {
  // Format Date to YYYY-MM-DD
  formatDateKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Today's date key in local time
  getTodayDateKey() {
    return this.formatDateKey(new Date());
  },

  // Human-friendly date: e.g. "30 SEPTEMBER 2026"
  formatDisplayDate(dateKey) {
    if (!dateKey) return '';
    const parts = dateKey.split('-');
    if (parts.length !== 3) return dateKey;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    const dayNum = d.getDate();
    const monthNames = [
      'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
      'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
    ];
    return `${dayNum} ${monthNames[month]} ${year}`;
  },

  // Short display date: e.g. "Sep 30, 2026" or "Wed, Sep 30"
  formatShortDate(dateKey, withDay = false) {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (withDay) {
      return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
    }
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${y}`;
  },

  // Get weekday number: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  getDayOfWeek(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  },

  // Add/subtract days from YYYY-MM-DD
  addDays(dateKey, days) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return this.formatDateKey(date);
  },

  // Difference in days between two YYYY-MM-DD dates (d2 - d1)
  diffInDays(dateKey1, dateKey2) {
    const [y1, m1, d1] = dateKey1.split('-').map(Number);
    const [y2, m2, d2] = dateKey2.split('-').map(Number);
    const t1 = new Date(y1, m1 - 1, d1).getTime();
    const t2 = new Date(y2, m2 - 1, d2).getTime();
    return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  },

  // Generate unique stable ID
  generateId(prefix = 'h') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },

  // Escape HTML to prevent injection
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Calculate completion percentage: uncapped (e.g. 133%)
  calculatePercentage(actual, target) {
    const numActual = Number(actual) || 0;
    const numTarget = Number(target) || 0;
    if (numTarget <= 0) return 0;
    return Math.round((numActual / numTarget) * 100);
  },

  // Determine status string: COMPLETE, PARTIAL, LOW, MISSED
  calculateStatus(type, actual, target, completed) {
    if (type === 'boolean') {
      return completed ? 'COMPLETE' : 'INCOMPLETE';
    }
    const pct = this.calculatePercentage(actual, target);
    if (pct >= 100) return 'COMPLETE';
    if (pct >= 50) return 'PARTIAL';
    return 'LOW';
  },

  // Check if habit is scheduled on given date
  isHabitScheduled(habit, dateKey) {
    if (!habit || habit.archived) return false;
    
    // Check start date constraint
    if (habit.startDate && dateKey < habit.startDate) {
      return false;
    }

    if (!habit.frequency || habit.frequency.type === 'daily') {
      return true;
    }

    if (habit.frequency.type === 'weekdays') {
      const day = this.getDayOfWeek(dateKey);
      const scheduledDays = Array.isArray(habit.frequency.days) ? habit.frequency.days : [];
      return scheduledDays.includes(day);
    }

    return true;
  },

  // Toast notification system
  showToast(message, type = 'info', duration = 3000) { if (typeof document === 'undefined' || !document.getElementById) return;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-msg">${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  },

  // Download Blob as file
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
