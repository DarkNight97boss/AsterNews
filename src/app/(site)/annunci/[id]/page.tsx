import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/site/widgets';
import { findListing } from '@/lib/repo-extra2';
import { getZones } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/annunci/[id]'>): Promise<Metadata> { const { id } = await params; const l = await findListing(id); return l && l.status === 'published' ? { title: l.title, description: l.body.slice(0, 160), robots: { index: l.kind === 'annuncio' } } : { title: 'Annuncio' }; }
export default async function ListingPage({ params }: PageProps<'/annunci/[id]'>) {
  const { id } = await params; const l = await findListing(id);
  if (!l || l.status !== 'published') notFound();
  const zone = (await getZones()).find((z) => z.id === l.zoneId);
  return (
    <div className="layout-sidebar"><div className="listing-detail">
      <span className="kicker"><Link href={l.kind === 'necrologio' ? '/necrologi' : '/annunci'}>{l.kind === 'necrologio' ? 'Necrologi' : 'Annunci'}</Link>{l.category && ` · ${l.category}`}{zone && ` · ${zone.name}`}</span>
      <h1>{l.title}</h1>
      {l.price && <p className="lc-price" style={{ fontSize: 22 }}>{l.price}</p>}
      {l.image && <img src={l.image} alt="" style={{ maxWidth: '100%', borderRadius: 6, margin: '12px 0' }} />}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: l.body.replace(/\n/g, '<br />') }} />
      {l.kind === 'annuncio' && <div className="listing-contact"><h3>Contatti</h3><p>{l.contactName}{l.contactPhone && <> · <a href={`tel:${l.contactPhone}`}>{l.contactPhone}</a></>}</p><p><a className="btn btn-primary btn-sm" href={`mailto:${l.contactEmail}?subject=${encodeURIComponent('Annuncio: ' + l.title)}`}>Scrivi all'inserzionista</a></p></div>}
      <p className="help">Pubblicato il {formatDate(l.publishedAt ?? l.createdAt, false)}{l.expiresAt && ` · valido fino al ${formatDate(l.expiresAt, false)}`}</p>
    </div><Sidebar /></div>
  );
}
