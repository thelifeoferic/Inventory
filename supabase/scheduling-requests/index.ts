declare const Deno:{env:{get(name:string):string|undefined};serve(handler:(request:Request)=>Promise<Response>):void};
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const validDate=(value:unknown):value is string=>typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export async function handleRequests(request:Request,url:string,key:string,emailKey?:string,emailFrom?:string){
 if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
 if(request.method==='POST'&&!['https://team-wren.vercel.app','https://inventory-mu-hazel-12.vercel.app'].includes(request.headers.get('origin')||''))return json({error:'Please submit from Team Wren.'},403);
 const token=request.headers.get('cookie')?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];
 if(!token)return json({error:'Sign in required.'},401);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
 const db=async(path:string,options:RequestInit={})=>{const r=await fetch(url+'/rest/v1/'+path,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('Database unavailable');return r.json();};
 const user=await db('rpc/nest_store',{method:'POST',body:JSON.stringify({op:'session',args:[hash,Date.now()]})});
 if(!user||user.must_change)return json({error:'Sign in required.'},401);
 const emailReady=!!emailKey&&!!emailFrom;
 if(request.method==='GET'){
  const rows=await db('nest_scheduling_requests?select=*&order=created_at.desc&limit=100'+(user.username==='eric'?'':'&username=eq.'+encodeURIComponent(user.username)));
  return json({requests:rows,emailReady});
 }
 const raw=await request.text();if(raw.length>12000)return json({error:'Request is too long.'},413);
 let data;try{data=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
 if(!data||typeof data.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(data.id))return json({error:'Invalid request reference.'},400);
 let rows=await db('nest_scheduling_requests?id=eq.'+data.id+'&select=*');
 if(rows.length&&rows[0].username!==user.username&&user.username!=='eric')return json({error:'Request not found.'},404);
 if(!rows.length){
  if(!['Time off','Shift change','Availability','Other'].includes(data.kind)||!validDate(data.startDate)||!validDate(data.endDate)||data.endDate<data.startDate||typeof data.details!=='string'||!data.details.trim()||data.details.length>3000||typeof data.replyEmail!=='string'||data.replyEmail.length>254||(data.replyEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.replyEmail)))return json({error:'Check the dates, request details, and contact email.'},400);
  const row={id:data.id,username:user.username,display_name:user.display_name,kind:data.kind,start_date:data.startDate,end_date:data.endDate,details:data.details.trim(),reply_email:data.replyEmail};
  await db('nest_scheduling_requests?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(row)});
  rows=await db('nest_scheduling_requests?id=eq.'+data.id+'&select=*');
 }
 const row=rows[0];if(!row||row.username!==user.username&&user.username!=='eric')return json({error:'Request not found.'},404);
 if(row.email_status==='sent')return json({request:row,emailReady,message:'Request saved and email notification sent to Eric. This is not an approval.'});
 if(!emailReady)return json({request:row,emailReady,message:'Request saved for Eric to review in Team Wren. Email notifications are not connected yet.'});
 // Never resend an uncertain delivery after the provider's 24-hour idempotency window.
 if(Date.now()-Date.parse(row.created_at)>23*3600000)return json({request:row,emailReady,message:'Request saved. Email delivery needs a manual check; please contact Eric.'});
 try{
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${emailKey}`,'Content-Type':'application/json','Idempotency-Key':'scheduling-request/'+row.id},body:JSON.stringify({from:emailFrom,to:['eric@hotelwren29.com'],...(row.reply_email?{reply_to:row.reply_email}:{}),subject:`Scheduling request: ${row.display_name} — ${row.kind}`,text:`${row.display_name} submitted a scheduling request.\n\nType: ${row.kind}\nDates: ${row.start_date} through ${row.end_date}\n\n${row.details}\n\nContact: ${row.reply_email||'Via Team Wren'}\nReference: ${row.id}\nReview: https://team-wren.vercel.app/schedule/requests\n\nThis request has not been approved.`}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Email unavailable');
  const receipt=await response.json();if(!receipt.id)throw new Error('Missing receipt');
  const saved=await db('nest_scheduling_requests?id=eq.'+row.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({email_status:'sent',emailed_at:new Date().toISOString()})});
  return json({request:saved[0],emailReady,message:'Request saved and email notification sent to Eric. This is not an approval.'});
 }catch{return json({request:row,emailReady,message:'Request saved, but email delivery could not be confirmed. Please retry the email notification.'});}
}
Deno.serve(async request=>{try{return await handleRequests(request,Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Deno.env.get('RESEND_API_KEY'),Deno.env.get('SCHEDULING_EMAIL_FROM'));}catch{return json({error:'Your request could not be confirmed. Retry with the same form to avoid duplicates.'},503);}});
