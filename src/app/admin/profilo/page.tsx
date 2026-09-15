import { ProfilePanel } from '@/components/admin/profile-panel';
import { requireUser } from '@/lib/auth';
import { listMySessionsAction } from '@/lib/actions-auth';

export default async function ProfilePage({ searchParams }: PageProps<'/admin/profilo'>) {
  const me = await requireUser();
  const { cambia } = await searchParams;
  const sessions = await listMySessionsAction();
  return <ProfilePanel user={me} sessions={sessions.map((s) => ({ id: s.id, current: s.current, userAgent: s.userAgent, ip: s.ip, lastSeen: s.lastSeen, createdAt: s.createdAt }))} forceChange={cambia === '1' || !!me.mustChangePassword} />;
}
