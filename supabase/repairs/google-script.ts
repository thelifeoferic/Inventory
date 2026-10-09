// Generated only for the authenticated manager. The token is scoped to the repair queue.
export function googleSetup(token:string){return `// Hotel Wren repair tracker — keep this project private.
// Select installWrenRepairs, then Run and authorize with the sheet owner's account.
const WREN_TOKEN = '${token}';
const WREN_ENDPOINT = 'https://eumekzhhqcdnwcongonh.supabase.co/functions/v1/nest-repairs?sync=1';
function installWrenRepairs() {
  syncWrenRepairs();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'syncWrenRepairs').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncWrenRepairs').timeBased().everyMinutes(5).create();
}
function wrenFetch(method, payload) {
  const result = UrlFetchApp.fetch(WREN_ENDPOINT, {method: method, headers: {Authorization: 'Bearer ' + WREN_TOKEN}, contentType: 'application/json', ...(payload ? {payload: JSON.stringify(payload)} : {}), muteHttpExceptions: true});
  if (result.getResponseCode() !== 200) throw new Error('Team Wren connection failed (' + result.getResponseCode() + ').');
  return JSON.parse(result.getContentText());
}
function syncWrenRepairs() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const book = SpreadsheetApp.openById('1hNV0DhqNGpTiq1NnN8Bg6KI8Z37cBJw2gq10Wh_QQ-4');
    const sheet = book.getSheets().find(s => s.getSheetId() === 1987054165);
    if (!sheet || sheet.getRange('G7').getValue() !== 'Repair / Issue') throw new Error('Repair tracker columns changed; please check the sheet.');
    const pending = wrenFetch('get').requests;
    const receipts = [];
    for (const item of pending) {
      // The reference travels with the row, so retries remain safe after sorting.
      const marker = '[Team Wren ' + item.id + ']';
      const values = sheet.getRange(8, 1, sheet.getMaxRows() - 7, 15).getValues();
      let offset = values.findIndex(row => String(row[14]).includes(marker));
      if (offset < 0) {
        // Only use unused template rows. Preserve formulas, dropdowns, and existing repairs.
        offset = values.findIndex(row => !row[1] && !row[6] && !row[7] && !row[8] && !row[9] && !row[10] && !row[11] && (!row[12] || row[12] === 'Not Checked') && !row[13] && !row[14] && (!row[2] || String(row[2]).trim() === 'unselected') && (!row[3] || row[3] === 'None') && !row[4] && (!row[5] || String(row[5]).trim() === 'Not Started'));
        if (offset < 0) throw new Error('Repair tracker has no unused template rows. Add rows before syncing.');
        const row = offset + 8;
        if (sheet.getRange(row, 2, 1, 14).getFormulas()[0].some(Boolean)) throw new Error('Unused repair row contains formulas; refusing to overwrite them.');
        const safe = value => /^[=+@-]/.test(String(value)) ? "'" + value : String(value);
        const reported = Utilities.formatDate(new Date(item.created_at), 'America/Los_Angeles', 'yyyy-MM-dd');
        const parts = reported.split('-').map(Number);
        const dateSerial = Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000 + 25569;
        // One rectangular write includes the deduplication marker. User text is never a formula.
        sheet.getRange(row, 2, 1, 14).setValues([[dateSerial, item.area, item.priority, item.impact, 'In Queue', safe((item.location ? item.location + ': ' : '') + item.details), '', '', '', '', '', 'Not Checked', '', safe('Reported by ' + item.display_name + '\\n' + marker)]]);
        sheet.getRange(row, 2).setNumberFormat('m/d/yy');
        SpreadsheetApp.flush();
      }
      receipts.push({id: item.id, reference: String(sheet.getRange(offset + 8, 1).getDisplayValue()) || 'Row ' + (offset + 8)});
    }
    wrenFetch('post', {receipts: receipts});
  } finally { lock.releaseLock(); }
}
`;}
