import { redirect } from 'next/navigation';
import { ZonesManager } from '@/components/admin/zones-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getZones, zoneCounts } from '@/lib/queries';

export default async function ZonesAdminPage() {
  const me = await requireUser();
  if (!can(me, 'category.manage')) redirect('/admin');
  const [zones, counts] = await Promise.all([getZones(), zoneCounts()]);
  return <ZonesManager zones={zones} counts={counts} />;
}
