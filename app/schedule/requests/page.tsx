import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {handleApi} from '@/server/vercel-backend';
import Requests from './requests';
export const dynamic='force-dynamic';
export default async function Page(){
 const h=await headers();const r=await handleApi(new Request('https://inventory.local/api/session',{headers:{cookie:h.get('cookie')||''}}));
 if(!r.ok)redirect('/login');const user=await r.json();if(user.mustChange)redirect('/login');
 return <Requests displayName={user.displayName} isManager={user.isAdmin===true}/>;
}
