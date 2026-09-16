import type { Metadata } from 'next';
import { ListingForm } from '@/components/site/listing-form';
import { getCurrentReader } from '@/lib/auth';
import { getZones } from '@/lib/queries';
import { listingsSettings } from '@/lib/actions-listings';

export const metadata: Metadata = { title: 'Pubblica un annuncio', robots: { index: false } };
export default async function NewListingPage({ searchParams }: PageProps<'/annunci/nuovo'>) {
  const [sp, zones, s, reader] = await Promise.all([searchParams, getZones(), listingsSettings(), getCurrentReader()]);
  const kind = sp.tipo === 'necrologio' ? 'necrologio' : 'annuncio';
  const notice = sp.pagato === '1' ? 'ok' : sp.annullato === '1' ? 'annullato' : '';
  return <ListingForm kind={kind} zones={zones.map((z) => ({ id: z.id, name: z.name }))} price={kind === 'necrologio' ? s.priceNecrologio : s.priceAnnuncio} free={s.freeForReaders && !!reader} moderation={s.moderation} days={s.days} reader={reader ? { name: reader.name, email: reader.email } : null} notice={notice} enabled={s.enabled} />;
}
