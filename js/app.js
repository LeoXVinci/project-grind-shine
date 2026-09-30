/**
 * PROJECT GRIND & SHINE
 * Master Application Bootstrap
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize IndexedDB
    await DB.init();

    // 2. Initialize Theme
    initTheme();

    // 3. Seed starter data if database is fresh
    await seedInitialDataIfNeeded();

    // 4. Initialize UI & Navigation
    UI.initNavigation();

    // 5. Initial Render
    await UI.renderTodayScreen();

    // 6. Register Service Worker for PWA
    registerServiceWorker();

    // 7. Setup PWA install prompt handler
    setupPwaInstall();

  } catch (err) {
    console.error('Fatal initialization error:', err);
    Utils.showToast(`Initialization Error: ${err.message}`, 'error', 5000);
  }
});

function initTheme() {
  const savedTheme = localStorage.getItem('grind_theme') || 'dark';
  applyTheme(savedTheme);

  const themeSelect = document.getElementById('settings-theme-select');
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      localStorage.setItem('grind_theme', selected);
      applyTheme(selected);
      Utils.showToast(`Theme switched to ${selected.toUpperCase()}`, 'info', 1500);
    });
  }

  // Listen to OS system theme changes if set to system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('grind_theme') === 'system') {
      applyTheme('system');
    }
  });
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

async function seedInitialDataIfNeeded() {
  const habits = await DB.getAll('habits');
  if (habits.length === 0) {
    const today = Utils.getTodayDateKey();
    const yesterday = Utils.addDays(today, -1);

    // Seed 3 starter tactical habits demonstrating the 3 types and sub-habits
    const h1 = await Habits.add({
      name: 'Physical Conditioning',
      icon: '🏋️',
      color: '#f59e0b',
      type: 'duration',
      target: 45,
      unit: 'mins',
      description: '45 minutes of deliberate physical training and endurance.',
      frequency: { type: 'daily' },
      startDate: yesterday,
      subhabits: ['Warm-up', 'Strength Training', 'Cardio / Ruck', 'Stretching']
    });

    const h2 = await Habits.add({
      name: 'Deep Reading',
      icon: '📚',
      color: '#10b981',
      type: 'numeric',
      target: 30,
      unit: 'pages',
      description: '30 pages of focused technical or philosophical reading.',
      frequency: { type: 'daily' },
      startDate: yesterday,
      subhabits: []
    });

    const h3 = await Habits.add({
      name: 'Daily Mission Planning',
      icon: '🎯',
      color: '#3b82f6',
      type: 'boolean',
      target: 1,
      unit: 'completion',
      description: 'Review tomorrow priorities and establish zero-excuse targets.',
      frequency: { type: 'daily' },
      startDate: yesterday,
      subhabits: []
    });

    // Seed yesterday's entries to establish a streak proof
    await Entries.saveEntry(h1, yesterday, 50, { 'Warm-up': true, 'Strength Training': true, 'Cardio / Ruck': true, 'Stretching': true });
    await Entries.saveEntry(h2, yesterday, 30);
    await Entries.saveEntry(h3, yesterday, 1);

    // Save initial reflection
    await Entries.saveDailyReflection(yesterday, 'Standards maintained. Zero negotiation.');
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path for GitHub Pages subfolder support
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('Service Worker registered with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('Service Worker registration skipped or failed:', err);
        });
    });
  }
}

let deferredPrompt = null;
function setupPwaInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBanner = document.getElementById('pwa-install-banner');
    if (installBanner) installBanner.style.display = 'flex';
  });

  const installBtn = document.getElementById('btn-pwa-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          Utils.showToast('App installed successfully.', 'success');
        }
        deferredPrompt = null;
        const installBanner = document.getElementById('pwa-install-banner');
        if (installBanner) installBanner.style.display = 'none';
      }
    });
  }
}
