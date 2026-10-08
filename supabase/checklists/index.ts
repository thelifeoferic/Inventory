import { checklistTemplates, validChecklistDate, type ChecklistShift } from '../../lib/checklist-templates.ts';
declare const Deno: {env:{get(name:string):string|undefined};serve(handler:(r:Request)=>Promise<Response>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function handleChecklists(request:Request,url:string,key:string) {
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
  if(request.method==='POST'&&!['https://inventory-mu-hazel-12.vercel.app','https://team-wren.vercel.app'].includes(request.headers.get('origin')||''))return json({error:'Please submit from the team platform.'},403);
  const token=request.headers.get('cookie')?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token)return json({error:'Sign in required.'},401);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),byte=>byte.toString(16).padStart(2,'0')).join('');
  const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
  const session=await fetch(url+'/rest/v1/rpc/nest_store',{method:'POST',headers,body:JSON.stringify({op:'session',args:[hash,Date.now()]}),signal:AbortSignal.timeout(15000)});
  if(!session.ok)throw new Error('Session lookup failed');
  const user=await session.json();
  if(!user || user.must_change)return json({error:'Sign in required.'},401);
  const params=new URL(request.url).searchParams;
  let body;
  if(request.method==='POST'){
    const text=await request.text();if(text.length>12000)return json({error:'Update is too large.'},413);
    try{body=JSON.parse(text);}catch{return json({error:'Invalid update.'},400);}
  }
  const date=request.method==='GET'?params.get('date'):body?.date;
  const shift=request.method==='GET'?params.get('shift'):body?.shift;
  if(!validChecklistDate(date)||(shift!=='AM'&&shift!=='PM'))return json({error:'Choose a valid date and AM or PM shift.'},400);
  const template=checklistTemplates[shift as ChecklistShift];
  if(request.method==='GET'){
    const response=await fetch(url+'/rest/v1/nest_checklists?work_date=eq.'+date+'&shift=eq.'+shift+'&select=*',{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Checklist lookup failed');
    const runs=await response.json();return json({run:runs[0]||null,template});
  }
  const action=body?.action;
  if(!['start','task','submit','reopen'].includes(action))return json({error:'Invalid action.'},400);
  if(action==='reopen'&&user.username!=='eric')return json({error:'Only Eric can reopen a completed shift.'},403);
  let data={};
  if(action==='start')data={tasks:template.map(task=>({...task,status:'todo',note:'',version:0,updated_by:null,updated_at:null}))};
  if(action==='task'){
    if(typeof body.id!=='string'||body.id.length>80||!Number.isSafeInteger(body.version)||body.version<0||!['todo','done','na'].includes(body.status)||typeof body.note!=='string'||body.note.length>2000)return json({error:'Invalid task update.'},400);
    if(body.status==='na'&&!body.note.trim())return json({error:'Add a reason for marking this task not applicable.'},400);
    data={id:body.id,version:body.version,status:body.status,note:body.note};
  }
  const response=await fetch(url+'/rest/v1/rpc/nest_checklist_change',{method:'POST',headers,body:JSON.stringify({p_date:date,p_shift:shift,p_action:action,p_actor:user.username,p_display:user.display_name,p_manager:user.username==='eric',p_data:data}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Checklist save failed');
  const result=await response.json();return result.error?json({error:result.error},result.status||400):json({...result,template});
}
Deno.serve(async request=>{try{return await handleChecklists(request,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);}catch{return json({error:'The checklist could not be saved or loaded. Please retry.'},503);}});
