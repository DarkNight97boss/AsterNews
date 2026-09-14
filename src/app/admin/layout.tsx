import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getCurrentUser } from '@/lib/auth';
import { can, permissionsOf } from '@/lib/permissions';
import { countByStatus, stats } from '@/lib/queries';
import './admin.scss';

export const metadata: Metadata = { title: 'Redazione', robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?redirect=/admin');
  const [counts, st] = await Promise.all([countByStatus(), stats()]);
  return <AdminShell user={user} permissions={permissionsOf(user)} reviewCount={can(user, 'article.publish') ? counts.review : 0} pendingComments={st.pendingComments} pendingEvents={st.pendingEvents} newReports={st.newReports}>{children}</AdminShell>;
}
