import worker from '../worker/index.ts';
import { createStore } from './adapter.ts';
declare const Deno: {env:{get(name:string):string|undefined};serve(handler:(r:Request)=>Promise<Response>):void};
Deno.serve(async (request:Request)=>{
 const url=new URL(request.url);
 const path=url.pathname.split('/nest-api').at(-1) || '/';
 if(!/^\/api\/(login|logout|password|session|inventory|notifications)$/.test(path)) return Response.json({error:'Not found'},{status:404});
 const origin=request.headers.get('Origin');
 const origins=['https://inventory-mu-hazel-12.vercel.app','https://team-wren.vercel.app'];
 const allowed=origin&&origins.includes(origin)?origin:origins[0];
 if(!['GET','HEAD'].includes(request.method)&&origin!==allowed) return Response.json({error:'Please submit from the inventory site.'},{status:403});
 const headers=new Headers(request.headers);
 // Rate limiting uses the account and global limits, not caller-provided IP headers.
 headers.delete('CF-Connecting-IP');
 const forwarded=new Request(allowed+path,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer()});
 try {
  const DB=createStore(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  return await worker.fetch(forwarded,{DB,ASSETS:{fetch:async()=>new Response('Not found',{status:404})}});
 } catch {return Response.json({error:'Service unavailable. Please retry.'},{status:503});}
});
