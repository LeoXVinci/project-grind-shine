# PROJECT GRIND & SHINE - BACKUP DIRECTORY

This directory is designed to store manual, client-side exported JSON backups of your habit tracking database.

## Recommended Workflow

1. In the app, navigate to **SETTINGS** -> **DATABASE BACKUP & RESTORE**.
2. Click **EXPORT BACKUP (JSON)**.
3. Save the file into this folder as `habits-backup.json`:
   ```bash
   cp ~/Downloads/grind-shine-backup-*.json ./backup/habits-backup.json
   ```
4. Commit and push to your private GitHub repository:
   ```bash
   git add backup/habits-backup.json
   git commit -m "chore: habit database backup $(date +%Y-%m-%d)"
   git push origin main
   ```
5. To restore on a new device or browser:
   - Download or clone `backup/habits-backup.json`.
   - Open **PROJECT GRIND & SHINE** in your browser.
   - Go to **SETTINGS** -> **RESTORE FROM JSON** and select `habits-backup.json`.

This approach requires zero credentials, zero API tokens, and zero external backend servers. Your data remains strictly yours.
