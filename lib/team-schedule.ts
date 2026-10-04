export type ScheduleDay = { occupancy: string; arrivals: string; departures: string; stayovers: string; hours: string };
export type ScheduleMember = { id: string; name: string; shifts: string[] };
export type TeamSchedule = { days: ScheduleDay[]; members: ScheduleMember[]; notes: string };
export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const scheduleMetrics = ['occupancy', 'arrivals', 'departures', 'stayovers', 'hours'] as const;
const morning = '7 AM – 3:30 PM';
const evening = '12:30 PM – 9 PM';
export const initialSchedule: TeamSchedule = {
  days: [
    ['42%', '3', '2', '2'], ['75%', '5', '1', '4'], ['75%', '4', '4', '5'], ['42%', '2', '6', 'x'], ['42%', '3', '3', '2'], ['25%', '2', '4', '1'], ['25%', '1', '1', '2'],
  ].map(([occupancy, arrivals, departures, stayovers]) => ({occupancy, arrivals, departures, stayovers, hours: '7 AM – 9 PM'})),
  members: [
    {id:'eric',name:'Eric Berry',shifts:['OFF','OFF','7:00 AM','9:00 AM','7:00 AM','12:30 PM','12:30 PM']},
    {id:'emilee',name:'Emilee Mae',shifts:['OFF','OFF',evening,evening,evening,evening,'OFF']},
    {id:'hannah',name:'Hannah Harding',shifts:[morning,morning,morning,morning,'OFF/R - EB','OFF/R - EB','OFF/R - EB']},
    {id:'meghan',name:'Meghan Topazio',shifts:[evening,evening,'OFF','OFF',morning,morning,morning]},
    {id:'delmara',name:'Delmara Garule',shifts:[morning,morning,morning,'OFF','OFF',morning,morning]},
    {id:'dana',name:'Dana Oharver',shifts:['OFF','OFF',morning,morning,morning,morning,morning]},
    {id:'shamu',name:'Shamu Aziziam',shifts:['10:30 AM – 7 PM','10:30 AM – 7 PM','10:30 AM – 7 PM',morning,'OFF','OFF','OFF']},
  ], notes: '',
};
export function blankSchedule(): TeamSchedule {
  return {days:dayNames.map(() => ({occupancy:'',arrivals:'',departures:'',stayovers:'',hours:''})),members:initialSchedule.members.map(member=>({...member,shifts:dayNames.map(()=> '')})),notes:''};
}
export function validWeek(week: unknown): week is string {
  if (typeof week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return false;
  const date = new Date(week+'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === week && date.getUTCDay() === 0;
}
export function validSchedule(value: unknown): value is TeamSchedule {
  if (!value || typeof value !== 'object') return false;
  const data = value as TeamSchedule;
  const text=(v:unknown,max:number)=>typeof v==='string' && v.length<=max;
  return Array.isArray(data.days) && data.days.length===7 && data.days.every(day=>day && scheduleMetrics.every(key=>text(day[key],80))) &&
    Array.isArray(data.members) && data.members.length>0 && data.members.length<=50 && data.members.every(member=>member && text(member.id,80) && member.id.trim() && text(member.name,100) && member.name.trim() && Array.isArray(member.shifts) && member.shifts.length===7 && member.shifts.every(shift=>text(shift,120))) &&
    new Set(data.members.map(member=>member.id)).size===data.members.length && text(data.notes,3000);
}
export function shiftWeek(week:string,days:number) { const date=new Date(week+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+days); return date.toISOString().slice(0,10); }
export function currentWeek() { const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); const date=new Date(today+'T12:00:00Z'); return shiftWeek(today,-date.getUTCDay()); }
