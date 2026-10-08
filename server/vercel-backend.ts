// Supabase validates the existing Wren session; no database secret is sent to Vercel or the browser.
const backend = 'https://eumekzhhqcdnwcongonh.supabase.co/functions/v1/nest-api';
export async function handleApi(request: Request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!/^\/api\/(session|login|logout|password|inventory|notifications|schedule)$/.test(path)) return Response.json({error:'Not found'},{status:404});
    const headers = new Headers();
    for (const name of ['cookie','origin','content-type']) {
      const value=request.headers.get(name); if(value) headers.set(name,value);
    }
    const response=await fetch((path === "/api/schedule" ? backend.replace("nest-api", "nest-schedule") : backend)+path+url.search,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(25000)});
    const outputHeaders=new Headers({'Cache-Control':'no-store'});
    for(const name of ['content-type','set-cookie','location']){const value=response.headers.get(name);if(value)outputHeaders.set(name,value);}
    return new Response(response.body,{status:response.status,headers:outputHeaders});
  } catch {return Response.json({error:'Team sign-in is temporarily unavailable. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
