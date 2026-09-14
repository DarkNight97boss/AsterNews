import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { EventCard } from '@/components/site/event-card';
import { Sidebar } from '@/components/site/widgets';
import { ZONE_KIND_LABELS } from '@/lib/models';
import { articlesByZone, getEvents, zoneBySlug } from '@/lib/queries';

export async function generateMetadata({ params }: PageProps<'/zone/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const z = zoneBySlug(slug);
  return z ? { title: `${z.name}: notizie e eventi`, description: `Le ultime notizie, le segnalazioni e gli eventi a ${z.name}.` } : {};
}

export default async function ZonePage({ params }: PageProps<'/zone/[slug]'>) {
  const { slug } = await params;
  const z = zoneBySlug(slug);
  if (!z) notFound();
  const articles = articlesByZone(z.id);
  const events = getEvents().filter((e) => e.zoneId === z.id).slice(0, 3);
  return (
    <>
      <div className="section-head"><span className="kicker">{ZONE_KIND_LABELS[z.kind]}</span><h1>{z.name}</h1><div className="sub-topics"><Link href="/zone">Tutte le zone</Link><Link href={`/eventi`}>Eventi</Link><Link href="/segnalazioni">Segnalazioni</Link></div></div>
      {events.length > 0 && <section className="section"><div className="section-title"><h2>Eventi a {z.name}</h2><Link href="/eventi">Tutti gli eventi →</Link></div><div className="events-grid">{events.map((e) => <EventCard key={e.id} event={e} />)}</div></section>}
      <div className="layout-sidebar"><div><div className="section-title"><h2>Notizie</h2></div><ArticleList articles={articles} /></div><Sidebar /></div>
    </>
  );
}
