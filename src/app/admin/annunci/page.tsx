import { redirect } from 'next/navigation';
import { ListingsManager } from '@/components/admin/listings-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getZones } from '@/lib/queries';
import { listListings } from '@/lib/repo-extra2';
import { listingsSettings } from '@/lib/actions-listings';

export default async function ListingsAdminPage({ searchParams }: PageProps<'/admin/annunci'>) {
  const me = await requireUser(); if (!can(me, 'comment.moderate')) redirect('/admin');
  const sp = await searchParams; const status = typeof sp.stato === 'string' ? sp.stato : 'pending';
  const [items, zones, s] = await Promise.all([listListings({ status: status === 'all' ? undefined : (status as 'pending') }, 200), getZones(), listingsSettings()]);
  return <ListingsManager items={items} zones={zones.map((z) => ({ id: z.id, name: z.name }))} status={status} settings={s} />;
}
