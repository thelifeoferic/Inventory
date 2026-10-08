import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { handleApi } from '@/server/vercel-backend';
import TeamSchedule from './team-schedule';
export const dynamic = 'force-dynamic';
export default async function SchedulePage() {
  const h = await headers();
  const response = await handleApi(new Request('https://inventory.local/api/session', {headers:{cookie:h.get('cookie') || ''}}));
  if (!response.ok) redirect('/login');
  const user = await response.json();
  if (user.mustChange) redirect('/login');
  return <TeamSchedule isManager={user.isAdmin === true} displayName={user.displayName} />;
}
