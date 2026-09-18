import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/site/widgets';
import { findListing } from '@/lib/repo-extra2';
import { getZones } from '@/lib/queries';
import { formatDate } from '@/lib/utils';
import { approvedOf } from '@/lib/commons-data';
import { ContributionForm } from '@/components/site/contribution-form';

export async function generateMetadata({ params }: PageProps<'/annunci/[id]'>): Promise<Metadata> { const { id } = await params; const l = await findListing(id); return l && l.status === 'published' ? { title: l.title, description: l.body.slice(0, 160), robots: { index: l.kind === 'annuncio' } } : { title: 'Annuncio' }; }
export default async function ListingPage({ params }: PageProps<'/annunci/[id]'>) {
  const { id } = await params; const l = await findListing(id);
  // I necrologi restano come pagina di memoria anche dopo la scadenza dell'annuncio
  if (!l || (l.status !== 'published' && !(l.kind === 'necrologio' && l.status === 'expired'))) notFound();
  const memories = l.kind === 'necrologio' ? await approvedOf('memory', { ref: l.id, limit: 200 }) : [];
  const zone = (await getZones()).find((z) => z.id === l.zoneId);
  return (
    <div className="layout-sidebar"><div className="listing-detail">
      <span className="kicker"><Link href={l.kind === 'necrologio' ? '/necrologi' : '/annunci'}>{l.kind === 'necrologio' ? 'Necrologi' : 'Annunci'}</Link>{l.category && ` · ${l.category}`}{zone && ` · ${zone.name}`}</span>
      <h1>{l.title}</h1>
      {l.price && <p className="lc-price" style={{ fontSize: 22 }}>{l.price}</p>}
      {l.image && <img src={l.image} alt="" style={{ maxWidth: '100%', borderRadius: 6, margin: '12px 0' }} />}
      <div className="article-body" dangerouslySetInnerHTML={{ __html: l.body.replace(/\n/g, '<br />') }} />
      {l.kind === 'annuncio' && <div className="listing-contact"><h3>Contatti</h3><p>{l.contactName}{l.contactPhone && <> · <a href={`tel:${l.contactPhone}`}>{l.contactPhone}</a></>}</p><p><a className="btn btn-primary btn-sm" href={`mailto:${l.contactEmail}?subject=${encodeURIComponent('Annuncio: ' + l.title)}`}>Scrivi all'inserzionista</a></p></div>}
      {l.kind === 'necrologio' && <section className="memories"><h2>I ricordi di chi l&apos;ha conosciuto</h2>{memories.length === 0 && <p className="help">Ancora nessun ricordo. Il primo può essere il tuo.</p>}{[...memories].reverse().map((m) => <blockquote key={m.id}><p>{m.data.text}</p><footer>{m.data.name}{m.data.relation ? `, ${m.data.relation}` : ''}</footer></blockquote>)}<ContributionForm kind="memory" refId={l.id} /></section>}
      <p className="help">Pubblicato il {formatDate(l.publishedAt ?? l.createdAt, false)}{l.expiresAt && ` · valido fino al ${formatDate(l.expiresAt, false)}`}</p>
    </div><Sidebar /></div>
  );
}
