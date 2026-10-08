import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { handleApi } from '@/server/vercel-backend';
import DailyChecklists from './daily-checklists';
export const dynamic = 'force-dynamic';
export default async function ChecklistPage(){
  const h=await headers();
  const response=await handleApi(new Request('https://inventory.local/api/session',{headers:{cookie:h.get('cookie')||''}}));
  if(!response.ok)redirect('/login');
  const user=await response.json();
  if(user.mustChange)redirect('/login');
  return <DailyChecklists isManager={user.isAdmin===true} displayName={user.displayName}/>;
}
