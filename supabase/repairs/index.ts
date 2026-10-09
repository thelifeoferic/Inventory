import {googleSetup} from './google-script.ts';
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export async function handleRepairs(request:Request,url:string,key:string){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 const db=async(path:string,options:RequestInit={})=>{const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Database unavailable');return r.json();};
 const read=async()=>{const raw=await request.text();if(raw.length>24000)throw new Error('Request too long');return JSON.parse(raw);};
 if(new URL(request.url).searchParams.get('sync')==='1'){
  const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token)return json({error:'Connection required.'},401);
  const connection=await db('nest_repair_sync?id=eq.true&key_hash=eq.'+await digest(token)+'&select=id');
  if(!connection.length)return json({error:'Connection required.'},401);
  if(request.method==='GET')return json({requests:await db('nest_repairs?synced_at=is.null&order=created_at.asc&limit=50')});
  const data=await read();
  if(!Array.isArray(data.receipts)||data.receipts.length>50||data.receipts.some((r:any)=>!uuid(r.id)||typeof r.reference!=='string'||r.reference.length>80))return json({error:'Invalid receipts.'},400);
  for(const receipt of data.receipts)await db('nest_repairs?id=eq.'+receipt.id+'&synced_at=is.null',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({synced_at:new Date().toISOString(),sheet_reference:receipt.reference})});
  await db('nest_repair_sync?id=eq.true',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({last_seen:new Date().toISOString()})});
  return json({ok:true});
 }
 if(request.method==='POST'&&!['https://team-wren.vercel.app','https://inventory-mu-hazel-12.vercel.app'].includes(request.headers.get('origin')||''))return json({error:'Please submit from Team Wren.'},403);
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!token)return json({error:'Sign in required.'},401);
 const user=await db('rpc/nest_store',{method:'POST',body:JSON.stringify({op:'session',args:[await digest(token),Date.now()]})});
 if(!user||user.must_change)return json({error:'Sign in required.'},401);
 if(request.method==='GET'){
  const connection=await db('nest_repair_sync?select=last_seen&limit=1');
  return json({requests:await db('nest_repairs?select=*&order=created_at.desc&limit=100'+(user.username==='eric'?'':'&username=eq.'+encodeURIComponent(user.username))),lastSync:connection[0]?.last_seen||null,isManager:user.username==='eric'});
 }
 let data;try{data=await read();}catch{return json({error:'Invalid request.'},400);}
 if(data?.action==='connect'){
  if(user.username!=='eric')return json({error:'Manager access required.'},403);
  const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  await db('nest_repair_sync?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:true,key_hash:await digest(secret),last_seen:null})});
  return json({script:googleSetup(secret)});
 }
 if(!uuid(data?.id))return json({error:'Invalid request reference.'},400);
 const existing=await db('nest_repairs?id=eq.'+data.id+'&select=*');
 if(existing.length)return existing[0].username===user.username?json({request:existing[0]}):json({error:'Request not found.'},404);
 const areas=['Lobby','Gardens','Guest Room','Pool','Windsong','Laundry','Maintence Room','Wren House','Conex','Pool Room'];
 if(!areas.includes(data.area)||!['Routine','Low','Medium','High','Urgent'].includes(data.priority)||!['Guest Facing','Immediate Impact','No Immediate Impact'].includes(data.impact)||typeof data.location!=='string'||data.location.length>120||typeof data.details!=='string'||!data.details.trim()||data.details.length>3000)return json({error:'Please check the location, priority, impact, and issue.'},400);
 const row={id:data.id,username:user.username,display_name:user.display_name,area:data.area,location:data.location.trim(),priority:data.priority,impact:data.impact,details:data.details.trim()};
 await db('nest_repairs?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(row)});
 const saved=await db('nest_repairs?id=eq.'+data.id+'&select=*');
 if(saved[0]?.username!==user.username)return json({error:'Request not found.'},404);
 return json({request:saved[0]});
}
Deno.serve(async request=>{try{return await handleRepairs(request,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);}catch{return json({error:'We could not confirm your request. Retry this form to avoid a duplicate.'},503);}});
