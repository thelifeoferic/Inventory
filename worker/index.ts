// Optional private initial-password history; never commit real staff hashes.
const users: { username: string; salt: string; passwordHash: string }[] = [];
import publicPaths from "./public-paths.json";
import { seedItems } from "../lib/inventory-data";
import { housekeepingSeedItems } from "../lib/housekeeping-data";
import { guestRoomSeedItems } from "../lib/guest-room-data";
import { propertySeedItems } from "../lib/property-data";

interface Env { DB: D1Database; ASSETS: Fetcher }
type User = { username:string; display_name:string; salt:string; password_hash:string; must_change:number };
const isAdmin = (user: User) => user.username === "eric";
const encoder = new TextEncoder();
const hex = (buffer:ArrayBuffer) => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2,"0")).join("");
const unhex = (value:string) => new Uint8Array(value.match(/../g)!.map(byte => parseInt(byte,16)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
const digest = async (value:string) => hex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));
export async function hashPassword(password:string,salt:string) {
  const key = await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-512",salt:unhex(salt),iterations:100000},key,512));
}
function equal(a:string,b:string) { let mismatch=a.length^b.length; for(let i=0;i<a.length;i++) mismatch |= a.charCodeAt(i)^(b.charCodeAt(i)||0); return mismatch===0; }
const json = (data:unknown,status=200,headers:Record<string,string>={}) => Response.json(data,{status,headers:{"Cache-Control":"no-store",...headers}});
function cookie(value:string,request:Request,maxAge=28800) { return `wren_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`; }
async function provision(_env:Env) {
  // Staff accounts are provisioned privately in Supabase, never from GitHub.
}

async function session(request:Request,env:Env) {
  const token = request.headers.get("Cookie")?.match(/(?:^|;\s*)wren_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token) return null;
  const tokenHash=await digest(token);
  const user=await env.DB.prepare("SELECT u.* FROM team_users u JOIN team_sessions s ON s.username=u.username WHERE s.token_hash=? AND s.expires>?").bind(tokenHash,Date.now()).first<User>();
  return user ? {...user,tokenHash} : null;
}
async function createSession(user:User,env:Env,request:Request) {
  const token=random();
  await env.DB.prepare("INSERT INTO team_sessions (token_hash,username,expires) VALUES (?,?,?)").bind(await digest(token),user.username,Date.now()+8*3600000).run();
  return json({mustChange:!!user.must_change,displayName:user.display_name},200,{"Set-Cookie":cookie(token,request)});
}
export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    try {
      const url=new URL(request.url), path=url.pathname;
      if(!["GET","HEAD"].includes(request.method) && request.headers.get("Origin") !== url.origin) return json({error:"Please submit from this site."},403);
      if(path.startsWith("/api/") && Number(request.headers.get("Content-Length")||0)>3000000) return json({error:"Request too large."},413);
      if(path==="/api/login" && request.method==="POST") {
        const body=await request.json() as {username?:string,password?:string};
        if(typeof body.username!=="string" || typeof body.password!=="string" || body.username.length>64 || body.password.length>256) return json({error:"Enter a valid username and password."},400);
        await provision(env);
        const username=body.username.trim().toLowerCase();
        const keys=["user:"+username,"ip:"+(request.headers.get("CF-Connecting-IP")||"local")];
        for(const key of keys) {
          const attempt=await env.DB.prepare("INSERT INTO login_attempts (key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING attempts").bind(key,Date.now()+15*60000,Date.now(),Date.now()).first<{attempts:number}>();
          if(attempt && attempt.attempts>(key.startsWith("user:")?8:40)) return json({error:"Too many sign-in attempts. Please wait 15 minutes."},429);
        }
        const user=await env.DB.prepare("SELECT * FROM team_users WHERE username=?").bind(username).first<User>();
        const candidate=await hashPassword(body.password,user?.salt||"00000000000000000000000000000000");
        if(!user || !equal(candidate,user.password_hash)) return json({error:"Username or password is incorrect."},401);
        await env.DB.prepare("DELETE FROM login_attempts WHERE key=?").bind(keys[0]).run();
        return createSession(user,env,request);
      }
      const user=await session(request,env);
      if(path==="/api/session") return user ? json({displayName:user.display_name,mustChange:!!user.must_change,isAdmin:isAdmin(user)}) : json({error:"Sign in required."},401);
      if(path==="/api/logout" && request.method==="POST") {
        if(user) await env.DB.prepare("DELETE FROM team_sessions WHERE token_hash=?").bind(user.tokenHash).run();
        return new Response(null,{status:303,headers:{Location:"/login","Set-Cookie":cookie("",request,0),"Cache-Control":"no-store"}});
      }
      if(path==="/api/password" && request.method==="POST") {
        if(!user) return json({error:"Sign in required."},401);
        const body=await request.json() as {password?:string};
        if(typeof body.password!=="string" || body.password.length<8 || body.password.length>256) return json({error:"Choose a password with at least 8 characters."},400);
        if(equal(await hashPassword(body.password,user.salt),user.password_hash)) return json({error:"Choose a different password."},400);
        const original=users.find(u=>u.username===user.username);
        if(original && equal(await hashPassword(body.password,original.salt),original.passwordHash)) return json({error:"Choose a password other than your initial password."},400);
        const salt=random(), passwordHash=await hashPassword(body.password,salt);
        await env.DB.batch([
          env.DB.prepare("UPDATE team_users SET salt=?,password_hash=?,must_change=0 WHERE username=?").bind(salt,passwordHash,user.username),
          env.DB.prepare("DELETE FROM team_sessions WHERE username=?").bind(user.username),
        ]);
        return createSession({...user,must_change:0},env,request);
      }
      if(path==="/login" || path==="/login/" || path==="/login.html" || (publicPaths as string[]).includes(path)) {
        const response=await env.ASSETS.fetch(request);
        return secure(response);
      }
      if(!user || user.must_change) return path.startsWith("/api/") ? json({error:"Sign in and change your initial password to continue."},user?403:401) : new Response(null,{status:302,headers:{Location:"/login","Cache-Control":"no-store"}});
      if(path==="/api/notifications") {
        if(request.method==="GET") {
          if(!isAdmin(user)) return json({error:"Admin access required."},403);
          const row=await env.DB.prepare("SELECT body FROM manager_reports WHERE id=1").first<{body:string}>();
          return json({reports:row ? JSON.parse(row.body) : []});
        }
        if(request.method==="POST") {
          const text=await request.text();
          if(text.length>10000) return json({error:"Report is too large."},413);
          const data=JSON.parse(text);
          if(!Number.isInteger(data.itemId)||!Number.isFinite(data.needed)||data.needed<=0||!["Running low","Low inventory","Out of stock"].includes(data.level)||typeof data.notes!=="string"||data.notes.length>1000) return json({error:"Enter a valid stock report."},400);
          const row=await env.DB.prepare("SELECT body FROM inventory_state WHERE id=1").first<{body:string}>();
          const items=row ? JSON.parse(row.body).items : [...seedItems,...housekeepingSeedItems,...guestRoomSeedItems,...propertySeedItems].map((item,i)=>({...item,id:i+1}));
          const item=items.find((i:{id:number})=>i.id===data.itemId);
          if(!item) return json({error:"Item no longer exists. Refresh inventory."},404);
          const report={id:random(),itemName:item.name,space:item.space,itemId:item.id,reporter:user.display_name,level:data.level,needed:data.needed,notes:data.notes,createdAt:new Date().toISOString()};
          await env.DB.prepare("INSERT INTO manager_reports (id,body) VALUES (1,json_array(json(?))) ON CONFLICT(id) DO UPDATE SET body=json_insert(manager_reports.body,'$[#]',json(?))").bind(JSON.stringify(report),JSON.stringify(report)).run();
          return json({id:report.id},201);
        }
        return json({error:"Method not allowed."},405);
      }
      if(path==="/api/inventory") {
        if(request.method==="GET") {
          const row=await env.DB.prepare("SELECT body,revision FROM inventory_state WHERE id=1").first<{body:string,revision:number}>();
          if(row) return json({...JSON.parse(row.body),revision:row.revision});
          const timestamp=new Date().toISOString();
          const items=[...seedItems,...housekeepingSeedItems,...guestRoomSeedItems,...propertySeedItems].map((item,i)=>({id:i+1,mapSection:"",reorderUrl:"",...item,createdAt:timestamp,updatedAt:timestamp}));
          return json({items,memories:[],revision:0});
        }
        if(request.method==="PUT") {
          const text=await request.text();
          if(text.length>3000000) return json({error:"Inventory is too large."},413);
          const data=JSON.parse(text);
          if(!Array.isArray(data.items)||!Array.isArray(data.memories)||!Number.isInteger(data.revision)||data.revision<0||data.items.length>10000||data.memories.length>10000) return json({error:"Invalid inventory."},400);
          if(data.items.some((i:any)=>!Number.isInteger(i.id)||typeof i.name!=="string"||typeof i.space!=="string"||typeof i.zone!=="string"||!Number.isFinite(i.quantity)||i.quantity<0||!Number.isFinite(i.par)||i.par<0)) return json({error:"Invalid item."},400);
          if(new Set(data.items.map((i:{id:number})=>i.id)).size!==data.items.length) return json({error:"Duplicate item IDs."},400);
          if(!isAdmin(user)) {
            const existing=await env.DB.prepare("SELECT body FROM inventory_state WHERE id=1").first<{body:string}>();
            const originals=existing ? JSON.parse(existing.body).items : [...seedItems,...housekeepingSeedItems,...guestRoomSeedItems,...propertySeedItems].map((item,i)=>({...item,id:i+1}));
            const photos=new Map(originals.map((i:{id:number;photo?:string})=>[i.id,i.photo||""]));
            if(data.items.some((i:{id:number;photo?:string})=>(i.photo||"")!==(photos.get(i.id)||""))) return json({error:"Only the admin can change product image URLs."},403);
          }
          const body=JSON.stringify({items:data.items,memories:data.memories});
          const result=data.revision===0
            ? await env.DB.prepare("INSERT OR IGNORE INTO inventory_state (id,body,revision) VALUES (1,?,1)").bind(body).run()
            : await env.DB.prepare("UPDATE inventory_state SET body=?,revision=revision+1 WHERE id=1 AND revision=?").bind(body,data.revision).run();
          if(!result.meta.changes) return json({error:"Inventory changed. Refresh and retry."},409);
          return json({revision:data.revision+1});
        }
        return json({error:"Method not allowed."},405);
      }
      if(path.startsWith("/api/")) return json({error:"Not found."},404);
      return secure(await env.ASSETS.fetch(request));
    } catch (error) { console.error(error instanceof Error ? error.message : "Request failed"); return json({error:"Something went wrong. Please try again."},500); }
  }
};
function secure(response:Response) {
  const result=new Response(response.body,response);
  result.headers.set("Cache-Control","no-store");
  result.headers.set("X-Content-Type-Options","nosniff");
  result.headers.set("Referrer-Policy","same-origin");
  return result;
}
