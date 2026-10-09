'use client';
import {useEffect,useRef,useState} from 'react';
import TeamNav from '../team-nav';
import './repairs.css';
type Repair={id:string;display_name:string;area:string;location:string;priority:string;details:string;created_at:string;synced_at:string|null;sheet_reference:string|null};
const sheet='https://docs.google.com/spreadsheets/d/1hNV0DhqNGpTiq1NnN8Bg6KI8Z37cBJw2gq10Wh_QQ-4/edit?gid=1987054165#gid=1987054165';
export default function Repairs({displayName}:{displayName:string}){
 const [rows,setRows]=useState<Repair[]>([]),[loaded,setLoaded]=useState(false),[manager,setManager]=useState(false),[lastSync,setLastSync]=useState<string|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[script,setScript]=useState(''),[copied,setCopied]=useState(false);
 const id=useRef<string|null>(null);const locked=useRef(false);
 async function load(){try{const r=await fetch('/api/repairs',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setRows(d.requests);setManager(d.isManager);setLastSync(d.lastSync);setLoaded(true);}catch(e){setError(e instanceof Error?e.message:'Unable to load requests.');}}
 useEffect(()=>{void load();},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(locked.current)return;locked.current=true;setBusy(true);setError('');setMessage('');const form=event.currentTarget;const fields=Object.fromEntries(new FormData(form));id.current??=crypto.randomUUID();
 try{const r=await fetch('/api/repairs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,id:id.current})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage('Request saved. You can follow its delivery to the repair tracker below.');form.reset();id.current=null;await load();}catch(e){setError(e instanceof Error?e.message:'Unable to save. Please try again.');}finally{locked.current=false;setBusy(false);}}
 async function connect(){setError('');setBusy(true);try{const r=await fetch('/api/repairs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connect'})});const d=await r.json();if(!r.ok)throw new Error(d.error);setScript(d.script);setCopied(false);setLastSync(null);}catch(e){setError(e instanceof Error?e.message:'Unable to prepare setup.');}finally{setBusy(false);}}
 const connected=lastSync&&Date.now()-Date.parse(lastSync)<15*60000;
 return <><TeamNav active="home"/><main className="repairs-page">
  <header className="repair-heading"><p className="repair-eyebrow">CARE FOR THE WREN</p><h1>Repair Request</h1><p>A little attention keeps everything feeling right.</p></header>
  <form onSubmit={submit} className="repair-form">
   <fieldset disabled={busy}><legend>What needs attention?</legend>
    <div className="repair-pair"><label>Area<select name="area" required defaultValue=""><option value="" disabled>Choose an area</option>{['Guest Room','Lobby','Pool Room','Pool','Gardens','Windsong','Laundry','Maintence Room','Wren House','Conex'].map(a=><option key={a} value={a}>{a==='Maintence Room'?'Maintenance Room':a}</option>)}</select></label>
    <label>Room or exact location<input name="location" maxLength={120} placeholder="e.g. Room 06 · bathroom"/></label></div>
    <label>Describe the issue<textarea name="details" required maxLength={3000} rows={5} placeholder="What happened, and what should we look for?"/></label>
    <div className="repair-pair"><label>Priority<select name="priority" defaultValue="Routine">{['Routine','Low','Medium','High','Urgent'].map(p=><option key={p}>{p}</option>)}</select></label>
    <label>Guest impact<select name="impact" defaultValue="No Immediate Impact">{['No Immediate Impact','Guest Facing','Immediate Impact'].map(p=><option key={p}>{p}</option>)}</select></label></div>
    <div className="repair-footer"><span>Reported by {displayName}</span><button className="repair-submit" type="submit">{busy?'Saving…':'Send request'}</button></div>
   </fieldset>
   <p className="repair-small">For an urgent issue, contact the manager directly as well.</p>
  </form>
  {error&&<p className="repair-alert" role="alert">{error}</p>}{message&&<p className="repair-success" role="status">{message}</p>}
  <section className="repair-history" aria-labelledby="repair-history-title"><div className="repair-section-heading"><h2 id="repair-history-title">{manager?'Team requests':'Your requests'}</h2><button className="text-button" onClick={()=>void load()}>Refresh</button></div>
   {!loaded?<p>Loading requests…</p>:<><p className="repair-small">{connected?'Requests sync to the repair tracker about every five minutes.':lastSync?'Tracker connection needs attention. Requests remain saved here.':'Google tracker connection is pending. Requests remain saved here.'}</p>{rows.length===0?<p className="repair-empty">No repair requests yet.</p>:rows.map(row=><article key={row.id}><div className="repair-row-top"><h3>{row.area==='Maintence Room'?'Maintenance Room':row.area}{row.location&&` · ${row.location}`}</h3><span className={'repair-priority '+(row.priority==='Urgent'?'urgent':'')}>{row.priority}</span></div><p className="repair-description">{row.details}</p><div className="repair-row-meta"><span>{row.display_name} · {new Date(row.created_at).toLocaleDateString('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric'})}</span><span>{row.synced_at?`In repair tracker · ${row.sheet_reference}`:'Waiting for tracker sync'}</span></div></article>)}</>}
  </section>
  {manager&&<details className="repair-setup"><summary>Repair tracker connection</summary><p><a href={sheet} target="_blank" rel="noreferrer">Open the repair tracker</a></p>{lastSync&&<p className="repair-small">Last successful sync: {new Date(lastSync).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})} Pacific.</p>}
   <p>Authorize the connection once with the Google account that can edit the tracker.</p>
   {!script?<><p className="repair-small">Generating new setup replaces any previous repair connection key.</p><button type="button" disabled={busy} onClick={connect}>Prepare Google setup</button></>:<><ol><li>Copy the setup script below.</li><li><a href="https://script.google.com/home/start" target="_blank" rel="noreferrer">Create a private Google Apps Script project</a> and replace its starter code.</li><li>Save, select <strong>installWrenRepairs</strong>, click <strong>Run</strong>, and authorize Google access.</li><li>Return here and select Refresh to confirm the connection.</li></ol><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(script);setCopied(true);}catch{setError('Select the script below and copy it manually.');}}}>{copied?'Copied':'Copy setup script'}</button><label className="repair-script-label">Private setup script<textarea readOnly value={script} rows={8} onFocus={e=>e.target.select()}/></label><p className="repair-small">Keep this project private. It can read pending repair requests and add them to this tracker. No public web deployment is needed.</p></>}
  </details>}
 </main></>;
}
