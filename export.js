/**
 * PROJECT GRIND & SHINE
 * Data Export Module (CSV & Multi-Sheet Excel)
 * Native client-side generation without server dependencies.
 */

const Exporter = (() => {
  // Helper to escape CSV cell (RFC 4180)
  function escapeCsvCell(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Helper to escape XML cell for SpreadsheetML
  function escapeXml(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Export all habit entries as clean CSV
   */
  async function exportCSV() {
    const habits = await DB.getAll('habits');
    const habitMap = new Map(habits.map(h => [h.id, h]));
    const entries = await DB.getAll('entries');
    entries.sort((a, b) => a.date.localeCompare(b.date));

    const headers = [
      'Habit ID',
      'Habit Name',
      'Date',
      'Habit Type',
      'Target',
      'Unit',
      'Actual',
      'Percentage',
      'Completed',
      'Partial',
      'Current Status',
      'Notes',
      'Sub-habit Data'
    ];

    const rows = [headers.join(',')];

    for (const entry of entries) {
      const habit = habitMap.get(entry.habitId) || { name: 'Unknown', type: entry.habitType };
      const isPartial = entry.percentage >= 50 && !entry.completed;

      let subhabitStr = '';
      if (entry.subhabits && typeof entry.subhabits === 'object') {
        subhabitStr = Object.entries(entry.subhabits)
          .map(([name, done]) => `${name}: ${done ? 'DONE' : 'PENDING'}`)
          .join('; ');
      }

      const row = [
        escapeCsvCell(entry.habitId),
        escapeCsvCell(habit.name),
        escapeCsvCell(entry.date),
        escapeCsvCell(entry.habitType || habit.type),
        escapeCsvCell(entry.target),
        escapeCsvCell(entry.unit || habit.unit),
        escapeCsvCell(entry.value),
        escapeCsvCell(`${entry.percentage}%`),
        escapeCsvCell(entry.completed ? 'YES' : 'NO'),
        escapeCsvCell(isPartial ? 'YES' : 'NO'),
        escapeCsvCell(entry.status),
        escapeCsvCell(entry.notes || ''),
        escapeCsvCell(subhabitStr)
      ];

      rows.push(row.join(','));
    }

    // Add UTF-8 BOM for Microsoft Excel compatibility
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `grind-shine-entries-${Utils.getTodayDateKey()}.csv`;
    Utils.downloadBlob(blob, filename);
    Utils.showToast('CSV export downloaded successfully', 'success');
  }

  /**
   * Export genuine Multi-Worksheet Excel Workbook (.xls/.xml)
   * Compatible with Microsoft Excel, Apple Numbers, Google Sheets, LibreOffice.
   * Sheets:
   * 1. Habit Summary
   * 2. Daily Entries
   * 3. Streaks
   * 4. Habit Definitions
   * 5. Daily Notes
   * 6. Dashboard Data
   */
  async function exportExcel() {
    const habits = await DB.getAll('habits');
    const habitMap = new Map(habits.map(h => [h.id, h]));
    const entries = await DB.getAll('entries');
    entries.sort((a, b) => a.date.localeCompare(b.date));
    const activeHabits = habits.filter(h => !h.archived);
    const dailyReflections = await Entries.getAllDailyReflections();
    const todaySummary = await Analytics.getTodaySummary(activeHabits);

    // Compute streaks and metrics for each habit
    const habitMetrics = [];
    for (const h of habits) {
      const m = await Analytics.getHabitDetailedMetrics(h);
      habitMetrics.push(m);
    }

    function buildXmlRow(cells, isHeader = false) {
      const cellElements = cells.map(c => {
        const val = escapeXml(c);
        const type = typeof c === 'number' ? 'Number' : 'String';
        const style = isHeader ? ' ss:StyleID="Header"' : '';
        return `<Cell${style}><Data ss:Type="${type}">${val}</Data></Cell>`;
      }).join('');
      return `<Row>${cellElements}</Row>`;
    }

    function buildWorksheet(name, headers, rows) {
      let sheet = `<Worksheet ss:Name="${escapeXml(name)}"><Table>`;
      sheet += buildXmlRow(headers, true);
      for (const r of rows) {
        sheet += buildXmlRow(r, false);
      }
      sheet += `</Table></Worksheet>`;
      return sheet;
    }

    // Sheet 1: Habit Summary
    const s1Headers = ['Habit Name', 'Type', 'Target', 'Unit', 'Active/Archived', 'Completion Rate %', 'Current Streak', 'Longest Streak', 'Total Scheduled', 'Total Completed'];
    const s1Rows = habitMetrics.map(m => [
      m.habit.name,
      m.habit.type,
      m.habit.target,
      m.habit.unit,
      m.habit.archived ? 'Archived' : 'Active',
      m.completionRate,
      m.currentStreak,
      m.longestStreak,
      m.totalScheduledDays,
      m.totalCompletedDays
    ]);

    // Sheet 2: Daily Entries
    const s2Headers = ['Habit Name', 'Date', 'Type', 'Target', 'Unit', 'Actual Value', 'Percentage %', 'Completed', 'Status', 'Notes', 'Sub-habits'];
    const s2Rows = entries.map(e => {
      const h = habitMap.get(e.habitId) || { name: 'Unknown' };
      let subStr = '';
      if (e.subhabits) {
        subStr = Object.entries(e.subhabits).map(([k, v]) => `${k}:${v ? 'DONE' : 'PEND'}`).join('; ');
      }
      return [
        h.name,
        e.date,
        e.habitType,
        e.target,
        e.unit,
        e.value,
        e.percentage,
        e.completed ? 'YES' : 'NO',
        e.status,
        e.notes || '',
        subStr
      ];
    });

    // Sheet 3: Streaks
    const s3Headers = ['Habit Name', 'Status', 'Current Streak (Days)', 'Longest Streak (Days)', 'Last Scheduled Date'];
    const s3Rows = habitMetrics.map(m => [
      m.habit.name,
      m.habit.archived ? 'Archived' : 'Active',
      m.currentStreak,
      m.longestStreak,
      Streaks.getPreviousScheduledDate(m.habit, Utils.getTodayDateKey()) || 'N/A'
    ]);

    // Sheet 4: Habit Definitions
    const s4Headers = ['Habit ID', 'Name', 'Icon', 'Color', 'Type', 'Target', 'Unit', 'Frequency Type', 'Start Date', 'Description', 'Sub-habits'];
    const s4Rows = habits.map(h => [
      h.id,
      h.name,
      h.icon,
      h.color,
      h.type,
      h.target,
      h.unit,
      h.frequency ? h.frequency.type : 'daily',
      h.startDate || '',
      h.description || '',
      Array.isArray(h.subhabits) ? h.subhabits.join(', ') : ''
    ]);

    // Sheet 5: Daily Notes
    const s5Headers = ['Date', 'Daily Reflection Note', 'Last Updated'];
    const s5Rows = dailyReflections.map(r => [
      r.date,
      r.note,
      r.updatedAt || ''
    ]);

    // Sheet 6: Dashboard Data
    const c7 = await Analytics.calculateConsistency(activeHabits, 7);
    const c30 = await Analytics.calculateConsistency(activeHabits, 30);
    const c90 = await Analytics.calculateConsistency(activeHabits, 90);
    const s6Headers = ['Metric', 'Value'];
    const s6Rows = [
      ['Report Date', todaySummary.date],
      ['Total Active Habits', activeHabits.length],
      ['Scheduled Today', todaySummary.scheduled],
      ['Completed Today', todaySummary.completed],
      ['Partial Today', todaySummary.partial],
      ['Missed Today', todaySummary.missed],
      ['Today Daily Score (Capped)', `${todaySummary.dailyScore}%`],
      ['Today Avg Target Achievement', `${todaySummary.avgAchievement}%`],
      ['7-Day Consistency', `${c7}%`],
      ['30-Day Consistency', `${c30}%`],
      ['90-Day Consistency', `${c90}%`]
    ];

    // Combine into full SpreadsheetML XML workbook
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
 </Styles>
 ${buildWorksheet('Habit Summary', s1Headers, s1Rows)}
 ${buildWorksheet('Daily Entries', s2Headers, s2Rows)}
 ${buildWorksheet('Streaks', s3Headers, s3Rows)}
 ${buildWorksheet('Habit Definitions', s4Headers, s4Rows)}
 ${buildWorksheet('Daily Notes', s5Headers, s5Rows)}
 ${buildWorksheet('Dashboard Data', s6Headers, s6Rows)}
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const filename = `grind-shine-analysis-${Utils.getTodayDateKey()}.xls`;
    Utils.downloadBlob(blob, filename);
    Utils.showToast('Multi-sheet Excel workbook exported successfully', 'success');
  }

  return {
    exportCSV,
    exportExcel
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Exporter;
}
