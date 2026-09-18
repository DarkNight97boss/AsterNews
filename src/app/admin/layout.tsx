import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getCurrentUser } from '@/lib/auth';
import { can, permissionsOf } from '@/lib/permissions';
import { countByStatus, getSettings, getUsers, stats } from '@/lib/queries';
import { DEFAULT_ADAPT } from '@/lib/admin-nav';
import { ensureInstalled } from '@/lib/install';
import './admin.scss';

export const metadata: Metadata = { title: 'Redazione', robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await ensureInstalled();
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/admin');
  const [counts, st, unread, usage, settings, users] = await Promise.all([countByStatus(), stats(), import('@/lib/repo-extra3').then((m) => m.countUnread(user.id)).catch(() => 0), import('@/lib/repo-extra3').then((m) => m.navUsage(user.id)).catch(() => ({ used: [] as string[], firstDay: null as string | null })), getSettings(), getUsers()]);
  const adapt = { ...DEFAULT_ADAPT, ...(settings.adapt ?? {}) }; const solo = users.filter((u) => u.active).length <= 1;
  const mature = !!usage.firstDay && usage.firstDay <= new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  return <AdminShell adapt={adapt} solo={solo} used={usage.used} mature={mature} user={user} permissions={permissionsOf(user)} unread={unread} reviewCount={can(user, 'article.publish') ? counts.review : 0} pendingComments={st.pendingComments} pendingEvents={st.pendingEvents} newReports={st.newReports}>{children}</AdminShell>;
}
