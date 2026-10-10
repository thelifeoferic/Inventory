'use client';
import { useEffect, useState } from 'react';
import TeamNav from '../team-nav';
import SheetConnection from './sheet-connection';
import { checklistToday, type ChecklistShift } from '@/lib/checklist-templates';
import './checklists.css';
type Task={id:string;label:string;status:'todo'|'done'|'na';note:string;version:number;updated_by:string|null;updated_at:string|null};
type Run={work_date:string;shift:ChecklistShift;tasks:Task[];started_by:string;started_at:string;submitted_by:string|null;submitted_at:string|null};
type Data={run:Run|null;template:{id:string;label:string}[]};
function TaskRow({task,disabled,editing,onEdit,onSave}:{task:Task;disabled:boolean;editing:boolean;onEdit:(open:boolean)=>void;onSave:(status:Task['status'],note:string)=>Promise<boolean>}){
  const [note,setNote]=useState(task.note);
  const [notApplicable,setNotApplicable]=useState(task.status==='na');
  return <li className={'checklist-task task-'+task.status}>
    <div className="checklist-task-main"><input type="checkbox" aria-label={task.label} checked={task.status==='done'} disabled={disabled||editing||task.status==='na'} onChange={event=>void onSave(event.target.checked?'done':'todo',task.note)}/><div><p>{task.label}</p>{task.status==='na'&&<small className="task-na">Not applicable</small>}{task.updated_by&&<small>{task.status==='done'?'Completed':task.status==='na'?'Marked N/A':'Updated'} by {task.updated_by}{task.updated_at?' · '+new Date(task.updated_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles'}):''}</small>}{task.note&&!editing&&<p className="task-note">{task.note}</p>}</div></div>
    {editing?<div className="task-note-editor"><label>Task note<textarea aria-label={`Note for ${task.label}`} maxLength={2000} rows={3} value={note} disabled={disabled} onChange={event=>setNote(event.target.value)}/></label><label className="task-na-control"><input type="checkbox" checked={notApplicable} disabled={disabled} onChange={event=>setNotApplicable(event.target.checked)}/>Not applicable this shift</label>{notApplicable&&<small>Include a brief reason in the note.</small>}<div><button className="button" disabled={disabled} onClick={()=>{setNote(task.note);setNotApplicable(task.status==='na');onEdit(false);}}>Cancel</button><button className="button button-dark" disabled={disabled||(notApplicable&&!note.trim())} onClick={async()=>{if(await onSave(notApplicable?'na':task.status==='na'?'todo':task.status,note))onEdit(false);}}>Save note</button></div></div>:<button className="text-button task-note-button" disabled={disabled} onClick={()=>onEdit(true)}>{task.note?'Edit note / status':'Add note / not applicable'}</button>}
  </li>;
}
export default function DailyChecklists({isManager,displayName}:{isManager:boolean;displayName:string}){
  const [date,setDate]=useState(checklistToday);
  const [shift,setShift]=useState<ChecklistShift>(()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',hourCycle:'h23'}).format(new Date()))<12?'AM':'PM');
  const [data,setData]=useState<Data|null>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [reload,setReload]=useState(0);
  const [editing,setEditing]=useState<string|null>(null);
  const [remainingOnly,setRemainingOnly]=useState(false);
  useEffect(()=>{
    let active=true;
    fetch(`/api/checklists?date=${date}&shift=${shift}`).then(async response=>{
      if(response.status===401){window.location.assign('/login');return;}
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Checklist could not be loaded.');if(active)setData(result);
    }).catch(caught=>{if(active)setError(caught instanceof Error?caught.message:'Checklist could not be loaded.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[date,shift,reload]);
  useEffect(()=>{if(!editing)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[editing]);
  useEffect(()=>{
    if(saving||editing||loading)return;
    let active=true;
    const refresh=async()=>{try{const r=await fetch(`/api/checklists?date=${date}&shift=${shift}`,{cache:'no-store'});if(r.ok){const next=await r.json();if(active)setData(next);}}catch{/* Keep the current checklist available. */}};
    const timer=window.setInterval(()=>void refresh(),30000);window.addEventListener('focus',refresh);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[date,shift,saving,editing,loading]);
  const run=data?.run;
  const tasks:Task[]=run?.tasks || data?.template.map(task=>({...task,status:'todo' as const,note:'',version:0,updated_by:null,updated_at:null})) || [];
  const done=tasks.filter(task=>task.status!=='todo').length;
  const locked=!!run?.submitted_at;
  function prepareLoad(){setLoading(true);setData(null);setError('');setNotice('');setEditing(null);setRemainingOnly(false);}
  async function update(action:string,extra:Record<string,unknown>={}){
    if(saving)return false;
    setSaving(true);setError('');setNotice('');
    try{
      const response=await fetch('/api/checklists',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,shift,action,...extra})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Your change was not saved. Please retry.');setData(result);setNotice(action==='submit'?'Shift complete. Thank you.':action==='reopen'?'Shift reopened.':'Saved.');return true;
    }catch(caught){setError(caught instanceof Error?caught.message:'Your change was not saved.');return false;}finally{setSaving(false);}
  }
  return <><TeamNav active="checklists" /><main className="checklists-page">
    <header className="checklists-heading"><div><p className="eyebrow">Hotel Wren · Front desk</p><h1>Daily checklists</h1><p>{displayName}</p></div></header>
    <section className="checklist-controls" aria-label="Choose checklist"><label>Date<input type="date" value={date} disabled={saving||!!editing} onChange={event=>{if(event.target.value&&event.target.value!==date){prepareLoad();setDate(event.target.value);}}}/></label><div className="checklist-shifts">{(['AM','PM'] as const).map(value=><button key={value} aria-pressed={shift===value} disabled={saving||!!editing} onClick={()=>{if(value!==shift){prepareLoad();setShift(value);}}}>{value} shift</button>)}</div><button className="text-button" disabled={saving||!!editing||loading} onClick={()=>{prepareLoad();setReload(value=>value+1);}}>Refresh</button></section>
    <SheetConnection date={date} shift={shift} isManager={isManager}/>
    {error&&<div className="checklist-error" role="alert">{error}{editing&&<button className="button" disabled={saving} onClick={()=>{prepareLoad();setReload(value=>value+1);}}>Discard note and reload</button>}</div>}
    <p className="checklist-save-status" role="status">{saving?'Saving…':notice}</p>
    {loading?<p>Loading checklist…</p>:data&&<>
      <section className="checklist-progress"><div><h2>{shift==='AM'?'Morning':'Evening'} checklist</h2><span>{done} of {tasks.length} addressed</span></div><progress value={done} max={tasks.length||1} aria-label="Checklist progress"/>
      {!run?<><p>Start a shared checklist for this date and shift. The team’s updates will be saved here.</p><button className="button button-dark" disabled={saving} onClick={()=>void update('start')}>Start {shift} checklist</button></>:locked?<p className="checklist-complete">Completed by {run.submitted_by} · {new Date(run.submitted_at!).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})}</p>:<p>Started by {run.started_by}. Check off tasks as you finish them.</p>}
      </section>
      {run&&<label className="checklist-filter"><input type="checkbox" checked={remainingOnly} disabled={!!editing} onChange={event=>setRemainingOnly(event.target.checked)}/>Show remaining only</label>}
      <ol className="checklist-tasks">{tasks.filter(task=>!remainingOnly||task.status==='todo'||editing===task.id).map(task=><TaskRow key={`${date}-${shift}-${task.id}-${task.version}`} task={task} disabled={saving||!run||locked||(!!editing&&editing!==task.id)} editing={editing===task.id} onEdit={open=>setEditing(open?task.id:null)} onSave={(status,note)=>update('task',{id:task.id,version:task.version,status,note})}/>)}</ol>
      {remainingOnly&&done===tasks.length&&<p>All tasks have been addressed.</p>}
      {run&&!locked&&<footer className="checklist-finish"><p>{done===tasks.length?'Ready to finish this shift.':'Complete tasks or add a reason when they are not applicable.'}</p><button className="button button-dark" disabled={saving||!!editing||done!==tasks.length||!tasks.length} onClick={()=>void update('submit')}>Complete shift</button></footer>}
      {locked&&isManager&&<button className="button" disabled={saving} onClick={()=>void update('reopen')}>Reopen shift</button>}
    </>}
  </main></>;
}
