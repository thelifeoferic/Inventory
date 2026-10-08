'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { blankSchedule, currentWeek, dayNames, scheduleMetrics, shiftWeek, validSchedule, type TeamSchedule as Schedule } from '@/lib/team-schedule';
import './schedule.css';
const dateLabel=(date:string)=>new Date(date+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
export default function TeamSchedule({isManager,displayName}:{isManager:boolean;displayName:string}) {
  const [week,setWeek]=useState(currentWeek);
  const [schedule,setSchedule]=useState<Schedule | null>(null);
  const [draft,setDraft]=useState<Schedule>(blankSchedule);
  const [revision,setRevision]=useState(0);
  const [editing,setEditing]=useState(false);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [day,setDay]=useState(0);
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let active=true;
    fetch('/api/schedule?week='+week).then(async response=>{
      if(response.status===401){window.location.assign('/login');return;}
      if(!response.ok)throw new Error('The schedule could not be loaded.');
      const data=await response.json();
      if(active){setSchedule(data.schedule);setRevision(data.revision);}
    }).catch(()=>{if(active)setError('The schedule could not be loaded. Please retry.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[week,reload]);
  useEffect(()=>{if(!editing)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[editing]);
  const shown=editing?draft:schedule;
  async function save() {
    if(!isManager || saving)return;
    if(!validSchedule(draft)){setError('Give each team member a name and keep entries within the allowed length.');return;}
    setSaving(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/schedule',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({week,revision,schedule:draft})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error || 'The schedule was not saved. Please retry.');
      setSchedule(draft);setRevision(data.revision);setEditing(false);setNotice('Schedule saved. The team can now see your changes.');
    } catch(caught){setError(caught instanceof Error?caught.message:'The schedule was not saved.');}finally{setSaving(false);}
  }
  function updateShift(id:string,index:number,value:string){setDraft(current=>({...current,members:current.members.map(member=>member.id===id?{...member,shifts:member.shifts.map((shift,i)=>i===index?value:shift)}:member)}));}
  function prepareLoad(){setLoading(true);setError('');setNotice('');setSchedule(null);}
  function retry(){prepareLoad();setReload(value=>value+1);}
  function moveWeek(next:string){if(!editing && next!==week){prepareLoad();setWeek(next);setDay(0);}}
  function shiftClass(value:string){return /^off/i.test(value)?'shift-off':/^(7|9)(:00)?\s*AM/i.test(value)?'shift-morning':value?'shift-late':'';}
  function editButton(){return isManager&&!editing&&!loading&&!error&&<button className="button button-dark" onClick={()=>{setDraft(structuredClone(schedule || blankSchedule()));setEditing(true);setNotice('');}}>{schedule?'Edit schedule':'Create schedule'}</button>;}
  return <main className="schedule-page">
    <header className="schedule-header"><div><p className="eyebrow">Hotel Wren</p><h1>Team schedule</h1></div>{!editing&&<Link className="button" href="/inventory">Inventory</Link>}{editButton()}</header>
    <p className="schedule-account">{displayName}{isManager?' · Manager':''}</p>
    <section className="schedule-week" aria-label="Schedule week">
      <button className="button" aria-label="Previous week" disabled={editing||loading} onClick={()=>moveWeek(shiftWeek(week,-7))}>←</button>
      <label>Week of<input type="date" aria-label="Week of" value={week} disabled={editing||loading} onChange={event=>{const value=event.target.value;if(value){const date=new Date(value+'T12:00:00Z');moveWeek(shiftWeek(value,-date.getUTCDay()));}}}/></label>
      <button className="button" aria-label="Next week" disabled={editing||loading} onClick={()=>moveWeek(shiftWeek(week,7))}>→</button>
      <span>{dateLabel(week)} – {dateLabel(shiftWeek(week,6))}</span>
    </section>
    {error&&<div className="schedule-message" role="alert">{error}{!editing&&<button className="button" onClick={retry}>Retry</button>}{editing&&/changed/i.test(error)&&<button className="button" onClick={()=>{setEditing(false);retry();}}>Discard draft and reload</button>}</div>}
    {notice&&<p role="status">{notice}</p>}
    {loading?<p role="status">Loading schedule…</p>:!shown?<p>No schedule has been published for this week.</p>:<>
      {editing&&<div className="schedule-edit-actions"><strong>Editing this week</strong><button className="button" disabled={saving} onClick={()=>{setEditing(false);setError('');}}>Cancel</button><button className="button button-dark" disabled={saving} onClick={()=>void save()}>{saving?'Saving…':'Save schedule'}</button></div>}
      <div className="schedule-days" aria-label="Choose a day">{dayNames.map((name,index)=><button key={name} aria-pressed={day===index} onClick={()=>setDay(index)}>{name.slice(0,3)}<small>{Number(shiftWeek(week,index).slice(-2))}</small></button>)}</div>
      <section className="schedule-day-card"><h2>{dayNames[day]} · {dateLabel(shiftWeek(week,day))}</h2>
        {shown.members.map(member=><div className={'schedule-person '+shiftClass(member.shifts[day])} key={member.id}><strong>{member.name}</strong>{editing?<input aria-label={`${member.name} ${dayNames[day]} shift`} maxLength={120} value={member.shifts[day]} disabled={saving} onChange={event=>updateShift(member.id,day,event.target.value)} placeholder="Shift or OFF"/>:<span>{member.shifts[day]||'Not scheduled'}</span>}</div>)}
        <details className="schedule-operations"><summary>Hotel details</summary>{scheduleMetrics.map(key=><label key={key}>{key}{editing?<input aria-label={`${dayNames[day]} ${key}`} maxLength={80} disabled={saving} value={shown.days[day][key]} onChange={event=>setDraft(current=>({...current,days:current.days.map((entry,i)=>i===day?{...entry,[key]:event.target.value}:entry)}))}/>:<strong>{shown.days[day][key]||'—'}</strong>}</label>)}</details>
      </section>
      <div className="schedule-grid"><table><caption>Team schedule · {dateLabel(week)} – {dateLabel(shiftWeek(week,6))}</caption><thead><tr><th scope="col">Team member</th>{dayNames.map((name,index)=><th scope="col" key={name}>{name}<small>{dateLabel(shiftWeek(week,index))}</small></th>)}</tr></thead><tbody>
        {shown.members.map(member=><tr key={member.id}><th scope="row">{member.name}</th>{member.shifts.map((shift,index)=><td className={shiftClass(shift)} key={index}>{editing?<input aria-label={`${member.name} ${dayNames[index]} shift`} maxLength={120} disabled={saving} value={shift} onChange={event=>updateShift(member.id,index,event.target.value)} placeholder="Shift or OFF"/>:shift||'—'}</td>)}</tr>)}
        {scheduleMetrics.map(key=><tr className="schedule-metric" key={key}><th scope="row">{key}</th>{shown.days.map((entry,index)=><td key={index}>{editing?<input aria-label={`${dayNames[index]} ${key}`} maxLength={80} disabled={saving} value={entry[key]} onChange={event=>setDraft(current=>({...current,days:current.days.map((value,i)=>i===index?{...value,[key]:event.target.value}:value)}))}/>:entry[key]||'—'}</td>)}</tr>)}
      </tbody></table></div>
      {editing&&<details className="schedule-team"><summary>Manage team members</summary>{draft.members.map(member=><div key={member.id}><input aria-label={`Name for ${member.name}`} maxLength={100} disabled={saving} value={member.name} onChange={event=>setDraft(current=>({...current,members:current.members.map(entry=>entry.id===member.id?{...entry,name:event.target.value}:entry)}))}/><button className="button" disabled={saving||draft.members.length===1} onClick={()=>setDraft(current=>({...current,members:current.members.filter(entry=>entry.id!==member.id)}))}>Remove {member.name}</button></div>)}<button className="button" disabled={saving||draft.members.length>=50} onClick={()=>setDraft(current=>({...current,members:[...current.members,{id:crypto.randomUUID(),name:'New team member',shifts:dayNames.map(()=> '')}]}))}>Add team member</button></details>}
      {(editing||shown.notes)&&<section className="schedule-notes"><h2>Team notes</h2>{editing?<textarea aria-label="Team notes" maxLength={3000} rows={3} disabled={saving} value={draft.notes} onChange={event=>setDraft(current=>({...current,notes:event.target.value}))}/>:<p>{shown.notes}</p>}</section>}
    </>}
  </main>;
}
