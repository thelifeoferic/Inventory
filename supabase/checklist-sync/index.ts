import {checklistTemplates,validChecklistDate} from '../../lib/checklist-templates.ts';
import {checklistGoogleSetup} from './google-script.ts';
declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(r:Request)=>Promise<Response>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const digest=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),b=>b.toString(16).padStart(2,'0')).join('');
export async function handleChecklistSync(request:Request,url:string,key:string){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 const db=async(path:string,options:RequestInit={})=>{const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Database unavailable');return r.json();};
 const bearer=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 if(bearer){
  if(!(await db('nest_checklist_sync_key?key_hash=eq.'+await digest(bearer))).length)return json({error:'Connection required.'},401);
  if(request.method==='GET')return json({templates:checklistTemplates,links:await db('nest_checklist_sheet_state?select=work_date,shift,sheet_id&limit=1000'),pending:await db('rpc/nest_checklist_sync_pending',{method:'POST',body:'{}'})});
  const raw=await request.text();if(raw.length>400000)return json({error:'Too large.'},413);let data;try{data=JSON.parse(raw);}catch{return json({error:'Invalid data.'},400);}
  if(!validChecklistDate(data?.date)||!['AM','PM'].includes(data.shift)||!Number.isSafeInteger(data.sheetId)||data.sheetId<0||!Array.isArray(data.rows)||data.rows.length<1||data.rows.length>150)return json({error:'Invalid shift.'},400);
  const template=checklistTemplates[data.shift as 'AM'|'PM'];
  if(data.rows.some((r:any)=>!template.some(t=>t.id===r.id&&t.label.trim()===r.label?.trim())||!Number.isInteger(r.row)||r.row<6||r.row>155||typeof r.checked!=='boolean'||typeof r.note!=='string'||r.note.length>2000)||new Set(data.rows.map((r:any)=>r.id)).size!==data.rows.length)return json({error:'Invalid task mapping.'},400);
  // A newly created blank tab starts from the app, never wipes existing app checks.
  if(data.newSheet===true)await db('rpc/nest_checklist_link_blank',{method:'POST',body:JSON.stringify({p_date:data.date,p_shift:data.shift,p_sheet_id:data.sheetId,p_rows:data.rows})});
  const result=await db('rpc/nest_sync_checklist',{method:'POST',body:JSON.stringify({p_date:data.date,p_shift:data.shift,p_sheet_id:data.sheetId,p_rows:data.rows})});
  await db('nest_checklist_sync_key?id=eq.true',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({last_seen:new Date().toISOString()})});
  return json(result);
 }
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return json({error:'Sign in required.'},401);
 const user=await db('rpc/nest_store',{method:'POST',body:JSON.stringify({op:'session',args:[await digest(token),Date.now()]})});if(!user||user.must_change)return json({error:'Sign in required.'},401);
 if(request.method==='GET'){const keys=await db('nest_checklist_sync_key?select=last_seen&limit=1');const states=await db('nest_checklist_sheet_state?select=work_date,shift,sheet_id,sync_error,updated_at&order=work_date.desc&limit=1000');return json({lastSync:keys[0]?.last_seen||null,states,isManager:user.username==='eric'});}
 if(!['https://team-wren.vercel.app','https://inventory-mu-hazel-12.vercel.app'].includes(request.headers.get('origin')||'')||user.username!=='eric')return json({error:'Manager access required.'},403);
 const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');await db('nest_checklist_sync_key?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:true,key_hash:await digest(secret),last_seen:null})});return json({script:checklistGoogleSetup(secret)});
}
Deno.serve(async r=>{try{return await handleChecklistSync(r,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);}catch{return json({error:'Checklist sync could not be completed. Please retry.'},503);}});
