import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getCurrentUser } from '@/lib/auth';
import { can, permissionsOf } from '@/lib/permissions';
import { countByStatus, getAllEvents, getComments, getReports } from '@/lib/queries';

export const metadata: Metadata = { title: 'Redazione', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/admin');
  return (
    <AdminShell user={user} permissions={permissionsOf(user)} reviewCount={can(user, 'article.publish') ? countByStatus().review : 0} pendingComments={getComments().filter((c) => c.status === 'pending').length} pendingEvents={getAllEvents().filter((e) => e.status === 'pending').length} newReports={getReports().filter((r) => r.status === 'new').length}>
      {children}
    </AdminShell>
  );
}
