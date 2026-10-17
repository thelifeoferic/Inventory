'use client';
import {useEffect,useState} from 'react';
import type {estimateLabor} from '@/lib/labor-estimate';
import {dayNames} from '@/lib/team-schedule';
type Estimate=ReturnType<typeof estimateLabor>;
const hours=(n:number|null)=>n===null?'Incomplete':n.toLocaleString('en-US',{maximumFractionDigits:2})+' hrs';
const money=(n:number|null)=>n===null?'Incomplete':n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export default function LaborSummary({week,revision}:{week:string;revision:number}){
 const [data,setData]=useState<Estimate|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setData(null);setError('');fetch('/api/schedule?labor=1&week='+week,{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Labor estimates could not be loaded.');const value=await r.json();if(active)setData(value.labor);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[week,revision,retry]);
 return <section className="labor-summary" aria-labelledby="labor-title"><header><p className="eyebrow">Private · Management</p><h2 id="labor-title">The week in numbers</h2><p>Estimated labor for the published schedule.</p></header>{loading?<p role="status">Loading labor estimates…</p>:error?<p role="alert">{error} <button className="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>:data?<>
 <div className="labor-totals"><div><span>Estimated scheduled hours</span><strong>{hours(data.scheduledHours)}</strong></div><div><span>Estimated base labor cost</span><strong>{money(data.cost)}</strong></div></div>
 <p className="labor-caption">Scheduled hours include breaks; costs use base hourly wages after confirmed unpaid breaks. Excludes overtime premiums, taxes and benefits. Missing wages, break settings or shift end times are flagged below.</p>
 <details><summary>Daily totals and team breakdown</summary><div className="labor-days">{data.days.map((day,i)=><div key={i}><strong>{dayNames[i].slice(0,3)}</strong><span>{hours(day.hours)}</span><span>{money(day.cost)}</span></div>)}</div><div className="labor-members">{data.members.map(member=><div key={member.id}><strong>{member.name}</strong><span>{hours(member.hours)}</span><span>{money(member.cost)}</span>{member.days.some(d=>d.issues.length>0)&&<small>{member.days.flatMap((d,i)=>d.issues.length?[dayNames[i].slice(0,3)+': '+d.issues.join(', ')]:[]).join(' · ')}</small>}</div>)}</div></details>
 </>:<p>No published schedule for this week.</p>}</section>;
}
