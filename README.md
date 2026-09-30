# PROJECT GRIND & SHINE

> **GRIND TODAY. SHINE TOMORROW.**  
> *Secondary Motivational Principle: DON'T MISS TWICE.*

**PROJECT GRIND & SHINE** is a personal habit formation and discipline portal engineered as a progressive web application (PWA). Designed with a tactical command-center philosophy, it provides uncompromised daily accountability, streak resilience tracking, habit analytics, and offline persistence—with zero servers, zero user logins, and zero third-party data tracking.

---

## 1. Core Philosophy & Tone

Generic productivity tools often treat consistency as an afterthought or distract users with childish gamification. Project Grind & Shine is built on:
- **Discipline & Execution:** Treating daily goals as non-negotiable operational standards.
- **Streak Integrity:** Streaks only count when daily targets are 100% achieved or exceeded.
- **"Don't Miss Twice" Alerting:** Immediate tactical visual warning when a habit was missed on its previous scheduled day, preventing consecutive lapses.
- **Historical Accuracy:** If you adjust targets down the road, historical records permanently retain their original target snapshot and percentage.

---

## 2. Key Features

- **IndexedDB Persistence:** Complete relational client-side database (`habits`, `entries`, `settings`, `motivation`, `metadata`).
- **Active Habit Cap:** Maximum of 20 active habits to preserve tactical focus. Displays capacity warnings at 18/20 and 20/20.
- **Three Core Habit Types:**
  1. **Boolean:** Binary YES / NO execution (100% or 0%).
  2. **Numeric:** Target quantity with custom units (e.g. 30 pages, 50 pushups). Supports partial completion and uncapped achievement (e.g., 125%).
  3. **Duration:** Target time stored in minutes (e.g. 45 mins) with fast mobile steppers.
- **Schedule Flexibility:** Schedule daily or on specific combinations of weekdays (e.g., Monday–Friday). Unscheduled days never break streaks.
- **Sub-Habits Checklist:** Nested checklist steps for complex routines (e.g., Morning Training: Warm-up, Strength, Cardio, Stretching).
- **Daily Score Metric:** Capped at 100% per habit to prevent an overachieving habit from masking neglected duties.
- **Contribution Heatmap:** GitHub-style 26-week calendar visualization with 5 intensity levels (0 to 4). Click any square to view or edit historical entries.
- **Executive Dashboard:** 7-day, 30-day, 90-day, and all-time consistency gauges, streak leaderboards, and SVG completion trend charts.
- **Data Export & Portability:**
  - Standard RFC 4180 CSV export with Microsoft Excel UTF-8 BOM.
  - Multi-sheet Excel workbook export (`.xls` SpreadsheetML) across 6 worksheets: *Habit Summary, Daily Entries, Streaks, Habit Definitions, Daily Notes, Dashboard Data*.
  - Full JSON backup export and validated JSON restore.
- **PWA & Offline Capability:** Standalone mobile app with Web App Manifest and Service Worker caching for complete offline functionality.
- **Tactical Dark/Light/System Themes:** High-contrast tactical amber and emerald palette with accessible contrast ratios.

---

## 3. Technical Architecture

- **Front-end:** Vanilla HTML5, CSS3, and modern ECMAScript (ES2022+).
- **No Heavy Frameworks:** Zero React, Vue, Angular, or bundlers required.
- **Storage:** Browser-native IndexedDB API (`GrindAndShineDB`).
- **Offline Engine:** Service Worker (`service-worker.js`) using Stale-While-Revalidate caching.
- **Zero Backend / Serverless:** Hostable completely free of charge on GitHub Pages or any static web server.
- **Zero API Keys:** No external analytics, authentication tokens, or cloud databases.

```
project-grind-shine/
├── index.html            # Main single-page application entry point
├── manifest.json         # PWA installation manifest
├── service-worker.js     # Offline service worker cache controller
├── README.md             # Project documentation and deployment guide
├── css/
│   ├── style.css         # Tactical styling, cards, tables, steppers, and layout
│   ├── responsive.css    # Mobile-first Android breakpoints (360px - 430px) & desktop
│   └── themes.css        # CSS variables for Dark, Light, and System themes
├── js/
│   ├── app.js            # Main bootstrap, theme listener, and service worker registration
│   ├── db.js             # IndexedDB wrapper and transaction management
│   ├── habits.js         # Habit models, validation, and active 20-habit limit
│   ├── entries.js        # Daily logging, subhabits, notes, and target preservation
│   ├── streaks.js        # Schedule-aware streak calculation engine & "Don't Miss Twice"
│   ├── analytics.js      # Daily score (capped), consistency windows, heatmap generator
│   ├── dashboard.js      # Executive dashboard UI and SVG trend charts
│   ├── export.js         # CSV & multi-sheet Excel export engines
│   ├── backup.js         # Full JSON database backup and restoration validator
│   ├── motivation.js     # State-driven tactical copy & rotating discipline principles
│   ├── ui.js             # Navigation controller, modals, and screen renders
│   └── utils.js          # Date helpers, sanitization, percentage math, and toasts
├── assets/
│   └── icons/            # SVG and PNG PWA application icons
└── backup/
    └── README.md         # Instructions for manual GitHub repository backups
```

---

## 4. Local Development Instructions

Because Project Grind & Shine utilizes modern browser APIs (IndexedDB and Service Workers), it should be served via HTTP/HTTPS rather than opened directly as a `file://` URL.

### Option 1: Python HTTP Server (Built-in)
```bash
cd project-grind-shine
python3 -m http.server 8080
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option 2: Node.js / npx
```bash
cd project-grind-shine
npx serve -l 8080 .
```

### Option 3: VS Code Live Server
Right-click `index.html` in VS Code and select **Open with Live Server**.

---

## 5. GitHub Pages Deployment Instructions

This repository is pre-configured with relative asset paths (`./css/...`, `./js/...`, `./manifest.json`), ensuring it works flawlessly when hosted from any root or subfolder on GitHub Pages.

1. **Create Repository:** Create a new repository on GitHub (e.g. `project-grind-shine`).
2. **Push Code:**
   ```bash
   git init
   git add .
   git commit -m "feat: initial release of Project Grind & Shine"
   git branch -M main
   git remote add origin https://github.com/<your-username>/project-grind-shine.git
   git push -u origin main
   ```
3. **Enable GitHub Pages:**
   - In your repository, navigate to **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**, select **Deploy from a branch**.
   - Select `main` branch and `/ (root)` folder (or `/project-grind-shine` if located in a subdirectory).
   - Click **Save**.
4. **Access Portal:**
   Your site will be live at:
   `https://<your-username>.github.io/project-grind-shine/`

---

## 6. Progressive Web App (PWA) Installation

### On Android (Chrome / Brave / Edge):
1. Navigate to your deployed GitHub Pages URL in your browser.
2. An **INSTALL PWA** banner will appear, or tap the browser menu (three dots) -> **Add to Home screen** / **Install app**.
3. The app will install directly to your app drawer and home screen. It will launch in full-screen standalone mode and operate completely offline.

### On Desktop (Chrome / Edge):
1. Click the install icon in the URL address bar.
2. Confirm installation. The app will launch in its own dedicated window.

---

## 7. Backup & Data Safety Protocol

Because your data lives in your browser's local IndexedDB, clearing your browser cache or switching devices could remove your local database. Use the built-in backup tools:

1. **Download JSON Backup:**
   - Go to **SETTINGS** -> **DATABASE BACKUP & RESTORE**.
   - Click **EXPORT BACKUP (JSON)**.
   - Save the file as `habits-backup.json`.
2. **Store in Private GitHub Repo (Recommended):**
   - Save the backup file to your private Git repository inside the `/backup/` directory.
   - Commit and push:
     ```bash
     git add backup/habits-backup.json
     git commit -m "chore: habit backup $(date +%Y-%m-%d)"
     git push origin main
     ```
3. **Restore Backup:**
   - On your new device or browser, visit the app.
   - Go to **SETTINGS** -> **RESTORE FROM JSON**.
   - Select your saved `habits-backup.json` file. The app validates the integrity and restores your full habit arsenal, history, and notes.

---

## 8. Limitations & Privacy Guarantees

- **Single-User Architecture:** Designed for an individual user on their own device.
- **No Cloud Synchronization:** To guarantee complete privacy and zero hosting costs, data is not transmitted to external cloud servers. Backups are user-initiated via JSON download.
- **20 Active Habit Limit:** Capped intentionally to enforce deliberate focus. Inactive or completed habits can be archived to retain full history while freeing slots for new missions.
