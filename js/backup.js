/**
 * PROJECT GRIND & SHINE
 * Full Database Backup & Restore Engine
 * Client-side secure JSON export, structural validation, and safe restoration.
 */

const Backup = (() => {
  const BACKUP_SCHEMA_VERSION = 1;

  async function exportBackupJSON() {
    const habits = await DB.getAll('habits');
    const entries = await DB.getAll('entries');
    const settings = await DB.getAll('settings');
    const motivation = await DB.getAll('motivation');
    const metadata = await DB.getAll('metadata');

    const backupPayload = {
      app: 'PROJECT GRIND & SHINE',
      tagline: 'GRIND TODAY. SHINE TOMORROW.',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      counts: {
        habits: habits.length,
        entries: entries.length,
        settings: settings.length
      },
      data: {
        habits,
        entries,
        settings,
        motivation,
        metadata
      }
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const filename = `grind-shine-backup-${Utils.getTodayDateKey()}.json`;
    Utils.downloadBlob(blob, filename);

    // Save timestamp of last backup
    await DB.put('metadata', {
      key: 'last_backup_date',
      value: new Date().toISOString()
    });

    Utils.showToast('Full JSON backup downloaded successfully', 'success');
  }

  function validateBackupData(data) {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Backup file is not a valid JSON object.' };
    }

    if (data.app !== 'PROJECT GRIND & SHINE' && !data.data) {
      return { valid: false, error: 'Invalid backup signature. Expected PROJECT GRIND & SHINE archive.' };
    }

    const payload = data.data || data;
    if (!Array.isArray(payload.habits) || !Array.isArray(payload.entries)) {
      return { valid: false, error: 'Backup is missing required habits or entries data.' };
    }

    // Validate habits array
    for (const h of payload.habits) {
      if (!h.id || !h.name || !h.type) {
        return { valid: false, error: 'Corrupted habit entry found in backup.' };
      }
    }

    return { valid: true, payload };
  }

  async function restoreFromJSON(jsonString) {
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      throw new Error('Malformed JSON file. Parsing failed.');
    }

    const validation = validateBackupData(parsed);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const { habits, entries, settings, motivation, metadata } = validation.payload;

    // Reset current database cleanly
    await DB.clearAllData();

    // Populate data
    if (habits && habits.length > 0) {
      await DB.putBatch('habits', habits);
    }
    if (entries && entries.length > 0) {
      await DB.putBatch('entries', entries);
    }
    if (settings && settings.length > 0) {
      await DB.putBatch('settings', settings);
    }
    if (motivation && motivation.length > 0) {
      await DB.putBatch('motivation', motivation);
    }
    if (metadata && metadata.length > 0) {
      await DB.putBatch('metadata', metadata);
    }

    await DB.put('metadata', {
      key: 'last_restored_date',
      value: new Date().toISOString()
    });

    return {
      habitsCount: habits ? habits.length : 0,
      entriesCount: entries ? entries.length : 0
    };
  }

  return {
    exportBackupJSON,
    validateBackupData,
    restoreFromJSON
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Backup;
}
