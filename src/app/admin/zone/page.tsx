import { redirect } from 'next/navigation';
import { ZonesManager } from '@/components/admin/zones-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getAllArticles, getZones } from '@/lib/queries';

export default async function ZonesAdminPage() {
  const me = await requireUser();
  if (!can(me, 'category.manage')) redirect('/admin');
  const counts: Record<string, number> = {};
  getAllArticles().forEach((a) => { if (a.zoneId) counts[a.zoneId] = (counts[a.zoneId] ?? 0) + 1; });
  return <ZonesManager zones={getZones()} counts={counts} />;
}
