import { validSchedule, validWeek } from '../../lib/team-schedule.ts';
declare const Deno: {env:{get(name:string):string|undefined};serve(handler:(r:Request)=>Promise<Response>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function handleSchedule(request:Request, url:string, key:string) {
  if(!['GET','PUT'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.method==='PUT'&&!['https://inventory-mu-hazel-12.vercel.app','https://team-wren.vercel.app'].includes(request.headers.get('origin')||''))return json({error:'Please submit from the inventory site.'},403);
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token)return json({error:'Sign in required.'},401);
  const tokenHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),byte=>byte.toString(16).padStart(2,'0')).join('');
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const session=await fetch(url+'/rest/v1/rpc/nest_store',{method:'POST',headers,body:JSON.stringify({op:'session',args:[tokenHash,Date.now()]}),signal:AbortSignal.timeout(15000)});
  if(!session.ok)throw new Error('Session lookup failed');
  const user=await session.json();
  if(!user || user.must_change)return json({error:'Sign in required.'},401);
  if(request.method==='GET') {
    const week=new URL(request.url).searchParams.get('week');
    if(!validWeek(week))return json({error:'Choose a week beginning Sunday.'},400);
    const result=await fetch(url+'/rest/v1/nest_schedule?week_start=eq.'+week+'&select=body,revision,updated_at',{headers,signal:AbortSignal.timeout(15000)});
    if(!result.ok)throw new Error('Schedule lookup failed');
    const rows=await result.json();
    return json({schedule:rows[0]?.body || null,revision:rows[0]?.revision || 0,updatedAt:rows[0]?.updated_at || null});
  }
  if(user.username!=='eric')return json({error:'Only Eric can edit the team schedule.'},403);
  const text=await request.text();
  if(text.length>100000)return json({error:'Schedule is too large.'},413);
  let data;try{data=JSON.parse(text);}catch{return json({error:'Invalid schedule.'},400);}
  if(!data || !validWeek(data.week) || !validSchedule(data.schedule) || !Number.isSafeInteger(data.revision) || data.revision<0)return json({error:'Invalid schedule.'},400);
  const inserting=data.revision===0;
  const endpoint=url+'/rest/v1/nest_schedule'+(inserting?'':'?week_start=eq.'+data.week+'&revision=eq.'+data.revision);
  const result=await fetch(endpoint,{method:inserting?'POST':'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify({...(inserting?{week_start:data.week}:{}),body:data.schedule,revision:data.revision+1,updated_by:user.username,updated_at:new Date().toISOString()}),signal:AbortSignal.timeout(15000)});
  if(result.status===409)return json({error:'This week changed in another session. Discard your draft and reload before editing again.'},409);
  if(!result.ok)throw new Error('Schedule save failed');
  const rows=await result.json();
  if(!rows.length)return json({error:'This week changed in another session. Discard your draft and reload before editing again.'},409);
  return json({revision:rows[0].revision,updatedAt:rows[0].updated_at});
}
Deno.serve(async request=>{try{return await handleSchedule(request,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);}catch{return json({error:'The schedule could not be saved or loaded. Please retry.'},503);}});
