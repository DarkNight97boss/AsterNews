import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import { EventCard } from '@/components/site/event-card';
import { getCurrentReader } from '@/lib/auth';
import { listCards } from '@/lib/civic-data';
import { delayDays } from '@/lib/civic';
import { articlesByZone, getEvents, getZones } from '@/lib/queries';
import { listReports } from '@/lib/repo';

export const metadata: Metadata = { title: 'Il mio quartiere', description: 'Tutto quello che riguarda la tua zona in una pagina: notizie, eventi, segnalazioni, cantieri, negozi.' };
export const dynamic = 'force-dynamic';
export default async function MyNeighbourhood({ searchParams }: PageProps<'/mio-quartiere'>) {
  const [sp, reader, zones] = await Promise.all([searchParams, getCurrentReader(), getZones()]);
  const chosen = typeof sp.zona === 'string' ? zones.find((z) => z.slug === sp.zona) : undefined; const mine = reader?.prefs?.zones?.length ? zones.filter((z) => reader.prefs!.zones!.includes(z.id)) : []; const z = chosen ?? mine[0];
  if (!z) return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Il mio quartiere</h1><p className="lead">Scegli la tua zona: notizie, eventi, segnalazioni, cantieri e negozi in una pagina sola.{!reader && <> Se <Link href="/account?redirect=/mio-quartiere">accedi</Link> e la salvi tra le preferenze, la ritrovi sempre qui.</>}</p><div className="chips">{zones.map((x) => <Link key={x.id} className="chip" href={`/mio-quartiere?zona=${x.slug}`}>{x.name}</Link>)}</div></div></div>;
  const [articles, events, reports, cantieri, negozi] = await Promise.all([articlesByZone(z.id, 12), getEvents({ zoneId: z.id }, 6), listReports(), listCards('cantiere'), listCards('negozio')]);
  const name = z.name.toLowerCase(); const near = <T extends { fields: Record<string, string>; body: string }>(list: T[]) => list.filter((c) => `${c.fields.via ?? ''} ${c.fields.indirizzo ?? ''} ${c.fields.zona ?? ''} ${c.body}`.toLowerCase().includes(name)).slice(0, 6);
  const rep = reports.filter((r) => r.zoneId === z.id && r.status !== 'archived').slice(0, 5); const works = near(cantieri); const shops = near(negozi); const now = Date.now();
  return <><div className="page-head"><span className="kicker">Il mio quartiere</span><h1>{z.name}</h1><p>{mine.length > 1 && <>Le tue zone: {mine.map((x) => <Link key={x.id} href={`/mio-quartiere?zona=${x.slug}`} style={{ marginRight: 8 }}>{x.name}</Link>)} · </>}<Link href="/mio-quartiere?zona=">altra zona</Link> · <Link href={`/zone/${z.slug}`}>la pagina della zona</Link>{reader && <> · <Link href="/account/per-te">preferenze</Link></>}</p></div>
    <div className="layout-sidebar"><div>{articles.length === 0 && <p className="help">Nessuna notizia recente per {z.name}.</p>}<div className="grid grid-2">{articles.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal-sm" showMeta />)}</div>{events.length > 0 && <section className="section"><div className="section-title"><h2>Eventi</h2></div><div className="events-grid">{events.map((e) => <EventCard key={e.id} event={e} />)}</div></section>}</div>
    <aside className="sidebar">{works.length > 0 && <div className="widget"><h4 className="widget-title">Cantieri</h4><ul className="widget-list">{works.map((c) => { const d = delayDays(c.fields.fine_prevista, c.fields.fine_effettiva, now); return <li key={c.id}><Link href={`/schede/cantiere/${c.slug}`}>{c.title}</Link>{d !== null && d > 0 && <span className="error-text"> · {d} giorni di ritardo</span>}</li>; })}</ul></div>}{rep.length > 0 && <div className="widget"><h4 className="widget-title">Segnalazioni aperte</h4><ul className="widget-list">{rep.map((r) => <li key={r.id}><Link href="/segnalazioni">{r.subject}</Link></li>)}</ul></div>}{shops.length > 0 && <div className="widget"><h4 className="widget-title">Negozi e attività</h4><ul className="widget-list">{shops.map((c) => <li key={c.id}><Link href={`/schede/negozio/${c.slug}`}>{c.title}</Link></li>)}</ul></div>}<div className="widget"><h4 className="widget-title">Fai qualcosa</h4><ul className="widget-list"><li><Link href="/segnalazioni">Segnala un problema</Link></li><li><Link href="/promemoria">Promemoria civici</Link></li><li><Link href="/domande">Chiedi alla redazione</Link></li></ul></div></aside></div></>;
}
