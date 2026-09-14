import { redirect } from 'next/navigation';
import { ReportsManager } from '@/components/admin/reports-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getReports, getZones } from '@/lib/queries';

export default async function ReportsAdminPage() {
  const me = await requireUser();
  if (!can(me, 'comment.moderate')) redirect('/admin');
  const [reports, zones] = await Promise.all([getReports(), getZones()]);
  return <ReportsManager reports={reports} zones={zones} />;
}
