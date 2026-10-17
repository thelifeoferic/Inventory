import type { TeamSchedule } from './team-schedule';
export type LaborRate = {member_id:string;effective_from:string;hourly_rate:number;unpaid_break_minutes:number|null;compensation_type?:'hourly'|'salary'};
export function shiftMinutes(shift:string):number|null {
  if(!shift.trim() || /^(off|out)\b/i.test(shift.trim()))return 0;
  const match=shift.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if(!match)return null;
  const minutes=(h:string,m:string|undefined,p:string)=>Number(h)<1||Number(h)>12||Number(m||0)>59?NaN:(Number(h)%12+(p.toUpperCase()==='PM'?12:0))*60+Number(m||0);
  const start=minutes(match[1],match[2],match[3]),end=minutes(match[4],match[5],match[6]);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end===start)return null;
  return (end-start+1440)%1440;
}
export function estimateLabor(schedule:TeamSchedule,week:string,rates:LaborRate[]) {
  const members=schedule.members.map(member=>{
    const days=member.shifts.map((shift,index)=>{
      const date=new Date(week+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+index);
      const rate=rates.filter(r=>r.member_id===member.id&&r.effective_from<=date.toISOString().slice(0,10)).sort((a,b)=>b.effective_from.localeCompare(a.effective_from))[0];
      if(rate?.compensation_type==='salary')return {shift,salaried:true,scheduledHours:0,hours:0,cost:0,issues:[] as string[]};
      const minutes=shiftMinutes(shift);
      const issues:string[]=[];
      if(minutes===null)issues.push('Add an end time');
      if(minutes!==0&&!rate)issues.push('Hourly wage missing');
      if(minutes!==0&&rate&&rate.unpaid_break_minutes===null)issues.push('Confirm unpaid break');
      const hours=minutes===null?null:minutes===0?0:!rate||rate.unpaid_break_minutes===null?null:Math.max(0,minutes-rate.unpaid_break_minutes)/60;
      return {shift,salaried:false,scheduledHours:minutes===null?null:minutes/60,hours,cost:hours===null||(!rate&&minutes!==0)?null:Math.round(hours*(rate?.hourly_rate||0)*100)/100,issues};
    });
    return {id:member.id,name:member.name,salaried:days.every(d=>d.salaried),days,scheduledHours:days.every(d=>d.scheduledHours!==null)?days.reduce((sum,d)=>sum+d.scheduledHours!,0):null,hours:days.every(d=>d.hours!==null)?days.reduce((sum,d)=>sum+d.hours!,0):null,cost:days.every(d=>d.cost!==null)?Math.round(days.reduce((sum,d)=>sum+d.cost!,0)*100)/100:null};
  });
  const days=Array.from({length:7},(_,i)=>({hours:members.every(m=>m.days[i].hours!==null)?members.reduce((sum,m)=>sum+m.days[i].hours!,0):null,cost:members.every(m=>m.days[i].cost!==null)?Math.round(members.reduce((sum,m)=>sum+m.days[i].cost!,0)*100)/100:null}));
  return {members,days,scheduledHours:members.every(m=>m.scheduledHours!==null)?members.reduce((sum,m)=>sum+m.scheduledHours!,0):null,hours:members.every(m=>m.hours!==null)?members.reduce((s,m)=>s+m.hours!,0):null,cost:members.every(m=>m.cost!==null)?Math.round(members.reduce((s,m)=>s+m.cost!,0)*100)/100:null};
}
