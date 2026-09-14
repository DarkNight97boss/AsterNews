import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventCard, Stars } from '@/components/site/event-card';
import { ShareBar } from '@/components/site/article-extras';
import { EVENT_TYPE_LABELS } from '@/lib/models';
import { eventBySlug, getEvents, zone } from '@/lib/queries';
import { eventDateLabel, stripHtml } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/eventi/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const e = await eventBySlug(slug);
  return e ? { title: e.title, description: stripHtml(e.description).slice(0, 160), openGraph: { images: e.image ? [{ url: e.image }] : [] } } : {};
}

export default async function EventPage({ params }: PageProps<'/eventi/[slug]'>) {
  const { slug } = await params;
  const e = await eventBySlug(slug);
  if (!e) notFound();
  const [z, all] = await Promise.all([zone(e.zoneId), getEvents({}, 100)]);
  const others = all.filter((x) => x.id !== e.id && (x.type === e.type || x.zoneId === e.zoneId)).slice(0, 3);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: e.dateFrom, endDate: e.dateTo ?? e.dateFrom, description: stripHtml(e.description), image: e.image || undefined, location: { '@type': 'Place', name: e.place, address: [e.address, z?.name].filter(Boolean).join(', ') }, offers: e.free ? { '@type': 'Offer', price: 0, priceCurrency: 'EUR' } : undefined };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="event-detail">
        <div>
          <span className="kicker"><Link href={`/eventi?tipo=${e.type}`}>{EVENT_TYPE_LABELS[e.type]}</Link>{z && <> · <Link href={`/zone/${z.slug}`}>{z.name}</Link></>}</span>
          <h1 className="serif" style={{ fontSize: 38, margin: '10px 0 8px', lineHeight: 1.12 }}>{e.title}</h1>
          <Stars n={e.rating} />
          {e.image && <figure className="article-cover" style={{ marginTop: 16 }}><img src={e.image} alt={e.title} /></figure>}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: e.description }} />
          <div style={{ margin: '24px 0' }}><ShareBar title={e.title} /></div>
        </div>
        <aside className="event-info">
          <h3>Informazioni</h3>
          <dl>
            <dt>Quando</dt><dd>{eventDateLabel(e.dateFrom, e.dateTo)}{e.timeInfo && <><br />{e.timeInfo}</>}</dd>
            <dt>Dove</dt><dd>{e.place}{e.address && <><br />{e.address}</>}{z && <><br /><Link href={`/zone/${z.slug}`}>{z.name}</Link></>}</dd>
            <dt>Prezzo</dt><dd>{e.free ? <span className="badge badge-gray">Gratis</span> : e.price || 'Non indicato'}</dd>
          </dl>
          {e.address && <a className="btn btn-blue btn-sm" href={`https://www.google.com/maps/search/${encodeURIComponent(`${e.place} ${e.address}`)}`} target="_blank" rel="noopener">Apri in Google Maps</a>}
          <Link href="/eventi" className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }}>← Tutti gli eventi</Link>
        </aside>
      </div>
      {others.length > 0 && <section className="section" style={{ marginTop: 40 }}><div className="section-title"><h2>Potrebbe interessarti</h2></div><div className="events-grid">{others.map((x) => <EventCard key={x.id} event={x} />)}</div></section>}
    </>
  );
}
