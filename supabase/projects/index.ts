declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const text=(v:unknown,max:number,required=false):v is string=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim());
const date=(v:unknown)=>v===''||typeof v==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const priorities=['Low','Normal','High','Urgent'],statuses=['To Do','In Progress','Waiting','Done'];
export function validProject(v:any){return v&&text(v.title,160,true)&&text(v.description,5000)&&['','eric','jess'].includes(v.owner)&&date(v.due)&&priorities.includes(v.priority)&&statuses.includes(v.status)&&Array.isArray(v.tasks)&&v.tasks.length<=200&&v.tasks.every((t:any)=>uuid(t.id)&&text(t.title,160,true)&&text(t.notes,3000)&&['','eric','jess'].includes(t.owner)&&date(t.due)&&priorities.includes(t.priority)&&statuses.includes(t.status))&&new Set(v.tasks.map((t:any)=>t.id)).size===v.tasks.length;}
export async function handleProjects(request:Request,url:string,key:string){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!['https://team-wren.vercel.app','https://inventory-mu-hazel-12.vercel.app'].includes(request.headers.get('origin')||''))return json({error:'Please submit from Team Wren.'},403);
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];if(!token)return json({error:'Sign in required.'},401);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 const db=async(path:string,options:RequestInit={})=>{const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Database unavailable');return r.json();};
 const user=await db('rpc/nest_store',{method:'POST',body:JSON.stringify({op:'session',args:[hash,Date.now()]})});if(!user||user.must_change)return json({error:'Sign in required.'},401);
 const manager=['eric','jess'].includes(user.username);
 if(request.method==='GET'){
  const projectId=new URL(request.url).searchParams.get('project');
  if(projectId){if(!manager)return json({error:'Project access is limited to Eric and Jess.'},403);if(!uuid(projectId))return json({error:'Invalid project.'},400);const rows=await db('nest_projects?id=eq.'+projectId);if(!rows.length)return json({error:'Project not found.'},404);return json({project:rows[0],comments:await db('nest_project_comments?project_id=eq.'+projectId+'&order=created_at.asc&limit=500')});}
  const [projects,requests]=await Promise.all([manager?db('nest_projects?order=updated_at.desc&limit=500'):Promise.resolve([]),db('nest_project_requests?order=created_at.desc&limit=500'+(manager?'':'&username=eq.'+encodeURIComponent(user.username)))]);
  return json({manager,username:user.username,projects,requests});
 }
 let data;try{const raw=await request.text();if(raw.length>800000)return json({error:'Project is too large.'},413);data=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(!data||!uuid(data.id))return json({error:'Invalid reference.'},400);
 if(data.action==='request'){
  if(!text(data.title,160,true)||!text(data.details,5000,true)||!priorities.includes(data.priority)||!date(data.due))return json({error:'Check the title, details, priority and date.'},400);
  const existing=await db('nest_project_requests?id=eq.'+data.id);if(existing.length)return existing[0].username===user.username?json({ok:true}):json({error:'Reference already used.'},409);
  await db('nest_project_requests?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:data.id,username:user.username,display_name:user.display_name,title:data.title.trim(),details:data.details.trim(),priority:data.priority,due_date:data.due})});return json({ok:true});
 }
 if(!manager)return json({error:'Only Eric and Jess can manage projects.'},403);
 if(data.action==='review'){
  if(!['Approved','Declined'].includes(data.decision)||!text(data.note,2000))return json({error:'Invalid review.'},400);
  const result=await db('rpc/nest_review_project_request',{method:'POST',body:JSON.stringify({request_id:data.id,actor:user.username,decision:data.decision,note:data.note.trim()})});return json(result,result.status||200);
 }
 if(data.action==='comment'){
  if(!uuid(data.projectId)||!text(data.message,3000,true))return json({error:'Enter a comment.'},400);
  if(!(await db('nest_projects?id=eq.'+data.projectId)).length)return json({error:'Project not found.'},404);
  await db('nest_project_comments?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:data.id,project_id:data.projectId,username:user.username,display_name:user.display_name,message:data.message.trim()})});return json({ok:true});
 }
 if(!['create','update'].includes(data.action)||!validProject(data.body))return json({error:'Check the project and task fields.'},400);
 // Explicit field selection prevents client-controlled metadata and oversized hidden properties.
 const clean=(v:any)=>({title:v.title.trim(),owner:v.owner,due:v.due,priority:v.priority,status:v.status});
 const body={...clean(data.body),description:data.body.description,tasks:data.body.tasks.map((t:any)=>({...clean(t),id:t.id,notes:t.notes}))};
 if(data.action==='create'){
  const rows=await db('nest_projects?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({id:data.id,body,created_by:user.username})});
  return json({ok:true,project:rows[0]||(await db('nest_projects?id=eq.'+data.id))[0]});
 }
 if(!Number.isInteger(data.revision)||data.revision<1)return json({error:'Invalid revision.'},400);
 const rows=await db('nest_projects?id=eq.'+data.id+'&revision=eq.'+data.revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({body,revision:data.revision+1,updated_at:new Date().toISOString()})});
 return rows.length?json({ok:true,project:rows[0]}):json({error:'This project changed while you were editing. Copy any unsaved changes, then reload the project.'},409);
}
Deno.serve(async request=>{try{return await handleProjects(request,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);}catch{return json({error:'Your changes could not be confirmed. Please retry.'},503);}});
