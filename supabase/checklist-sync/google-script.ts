export function checklistGoogleSetup(token:string){return String.raw`// Hotel Wren checklist sync. Keep this standalone Google project private.
const CHECKLIST_TOKEN = '${token}';
const CHECKLIST_BOOK = '1kzK1vKnxCYRDqeLX0RbTpoz0Feusqlvwvdf2rBrU51M';
const CHECKLIST_API = 'https://eumekzhhqcdnwcongonh.supabase.co/functions/v1/nest-checklist-sync';
function installWrenChecklists() {
  syncWrenChecklists();
  ScriptApp.getProjectTriggers().filter(t => ['syncWrenChecklists','onWrenChecklistEdit'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncWrenChecklists').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('onWrenChecklistEdit').forSpreadsheet(CHECKLIST_BOOK).onEdit().create();
}
function checklistFetch(payload) {
  const r = UrlFetchApp.fetch(CHECKLIST_API, {method:payload?'post':'get',headers:{Authorization:'Bearer '+CHECKLIST_TOKEN},contentType:'application/json',...(payload?{payload:JSON.stringify(payload)}:{}),muteHttpExceptions:true});
  if(r.getResponseCode()!==200)throw new Error('Checklist connection failed ('+r.getResponseCode()+').');
  return JSON.parse(r.getContentText());
}
function onWrenChecklistEdit(e) { if(e && e.range) syncWrenChecklists(e.range.getSheet().getSheetId()); }
function syncWrenChecklists(editedId) {
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try {
    const book=SpreadsheetApp.openById(CHECKLIST_BOOK), config=checklistFetch(), now=new Date();
    const today=Utilities.formatDate(now,'America/Los_Angeles','yyyy-MM-dd');
    const cutoff=new Date(today+'T12:00:00Z');cutoff.setUTCDate(cutoff.getUTCDate()-14);
    const wanted=new Set(config.pending.map(p=>p.work_date+' '+p.shift));
    const candidates=[];
    for(const sheet of book.getSheets()){
      const linked=config.links.find(l=>l.sheet_id===sheet.getSheetId());
      let date,shift;
      if(linked){date=linked.work_date;shift=linked.shift;}
      else{
        const m=sheet.getName().trim().match(/^(AM|PM)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/i);if(!m)continue;
        shift=m[1].toUpperCase();let year=m[4]?Number(m[4]):Number(today.slice(0,4));
        date=year+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0');
        if(!m[4]&&date>today&&Number(m[2])===12&&Number(today.slice(5,7))===1)date=(year-1)+date.slice(4);
        if((new Date(date+'T12:00:00Z')<cutoff||date>today)&&!wanted.has(date+' '+shift))continue;
      }
      if(new Date(date+'T12:00:00Z')>=cutoff||wanted.has(date+' '+shift)||sheet.getSheetId()===editedId)candidates.push({sheet,date,shift});
    }
    for(const pending of config.pending){
      const key=pending.work_date+' '+pending.shift;
      if(candidates.some(c=>c.date+' '+c.shift===key))continue;
      const linked=config.links.find(l=>l.work_date===pending.work_date&&l.shift===pending.shift);
      if(linked)throw Error('A linked checklist tab was removed. Restore it before syncing.');
      const master=book.getSheets().find(s=>s.getName().trim()===pending.shift+' Checklist Master');
      if(!master)throw Error('Checklist master not found.');
      const name=pending.shift+' '+Number(pending.work_date.slice(5,7))+'/'+Number(pending.work_date.slice(8))+'/'+pending.work_date.slice(0,4);
      let sheet=book.getSheetByName(name);
      if(!sheet){sheet=master.copyTo(book).setName(name);const values=sheet.getRange(6,1,Math.min(sheet.getMaxRows()-5,150),3).getValues();values.forEach((r,i)=>{if(String(r[0]).trim()){sheet.getRange(i+6,2).setValue(false);sheet.getRange(i+6,3).clearContent();}});}
      candidates.push({sheet,date:pending.work_date,shift:pending.shift,newSheet:true});
    }
    const seen=new Set();const errors=[];
    for(const c of candidates){
      const key=c.date+' '+c.shift;if(seen.has(key)){errors.push('Duplicate tabs for '+key);continue;}seen.add(key);
      if(candidates.filter(x=>x.date+' '+x.shift===key).length!==1){errors.push('Duplicate tabs for '+key);continue;}
      const rows=readWrenChecklist(c.sheet,c.shift,config.templates);
      const result=checklistFetch({date:c.date,shift:c.shift,sheetId:c.sheet.getSheetId(),rows,newSheet:!!c.newSheet});
      for(const write of result.writes){
        const range=c.sheet.getRange(write.row,1,1,3),current=range.getValues()[0];
        if(String(current[0]).trim()!==write.label.trim()||current[1]!==write.expected.checked||String(current[2]||'')!==write.expected.note){errors.push('Cell changed during sync: '+key);continue;}
        if(c.sheet.getRange(write.row,2,1,2).getFormulas()[0].some(Boolean))throw Error('A checklist value became a formula; not overwriting it.');
        const note=/^\s*[=+@-]/.test(write.value.note)?"'"+write.value.note:write.value.note;
        c.sheet.getRange(write.row,2,1,2).setValues([[write.value.checked,note]]);
      }
      SpreadsheetApp.flush();
      // Confirm the applied values; the server advances its baseline only after observing a match.
      const verified=checklistFetch({date:c.date,shift:c.shift,sheetId:c.sheet.getSheetId(),rows:readWrenChecklist(c.sheet,c.shift,config.templates)});
      errors.push(...verified.conflicts.map(v=>key+': '+v));
    }
    if(errors.length)throw Error(errors.join('\n').slice(0,3000));
  } finally {lock.releaseLock();}
}
function readWrenChecklist(sheet,shift,templates){
  const count=Math.min(sheet.getMaxRows()-5,150),range=sheet.getRange(6,1,count,3),values=range.getValues(),rules=range.getDataValidations(),formulas=range.getFormulas(),seen=new Set();
  return values.flatMap((r,i)=>{
    const label=String(r[0]).trim();if(!label)return [];
    const task=templates[shift].find(t=>t.label.trim()===label);if(!task)throw Error('Unrecognized task in '+sheet.getName()+': '+label);
    if(seen.has(task.id))throw Error('Duplicate task in '+sheet.getName());seen.add(task.id);
    if(!rules[i][1]||rules[i][1].getCriteriaType()!==SpreadsheetApp.DataValidationCriteria.CHECKBOX||typeof r[1]!=='boolean'||formulas[i][1]||formulas[i][2])throw Error('Expected checkbox and plain note in '+sheet.getName()+' row '+(i+6));
    return [{id:task.id,label:task.label,row:i+6,checked:r[1],note:String(r[2]||'')}];
  });
}
`;}
