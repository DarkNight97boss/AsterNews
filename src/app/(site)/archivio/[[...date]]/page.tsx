import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { archiveDays, archiveMonths } from '@/lib/insights';
import { listArticles } from '@/lib/repo';

export const dynamic = 'force-dynamic';
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const label = (y: string, m?: string, d?: string) => (d ? `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}` : m ? `${MONTHS[Number(m) - 1]} ${y}` : y);
export async function generateMetadata({ params }: PageProps<'/archivio/[[...date]]'>): Promise<Metadata> { const { date = [] } = await params; const [y, m, d] = date; return { title: y ? `Archivio: ${label(y, m, d)}` : 'Archivio storico', description: `Tutti gli articoli pubblicati${y ? ' ' + (d ? 'il ' : 'nel mese di ') + label(y, m, d) : ', giorno per giorno'}.`, alternates: { canonical: `/archivio${date.length ? '/' + date.join('/') : ''}` } }; }

/** Archivio storico per data: /archivio, /archivio/2026/09, /archivio/2026/09/18. */
export default async function ArchivePage({ params }: PageProps<'/archivio/[[...date]]'>) {
  const { date = [] } = await params; const [y, m, d] = date;
  if (date.length > 3 || (y && !/^\d{4}$/.test(y)) || (m && !/^(0[1-9]|1[0-2])$/.test(m)) || (d && !/^(0[1-9]|[12]\d|3[01])$/.test(d))) notFound();
  if (y && m && d) {
    const from = `${y}-${m}-${d}T00:00:00.000Z`; const to = `${y}-${m}-${d}T23:59:59.999Z`;
    const list = (await listArticles({ status: 'published', from, to }, 'published', 200)); if (!list.length) notFound();
    return <><div className="page-head"><span className="kicker"><Link href="/archivio">Archivio</Link> · <Link href={`/archivio/${y}/${m}`}>{label(y, m)}</Link></span><h1>{label(y, m, d)}</h1><p><span className="count">{list.length} articoli</span></p></div><div className="list-divided">{list.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" showExcerpt showMeta />)}</div></>;
  }
  if (y && m) { const days = await archiveDays(`${y}-${m}`); if (!days.length) notFound(); return <><div className="page-head"><span className="kicker"><Link href="/archivio">Archivio</Link></span><h1>{label(y, m)}</h1></div><ul className="archive-list">{days.map((x) => <li key={x.day}><Link href={`/archivio/${x.day.replace(/-/g, '/')}`}>{label(y, m, x.day.slice(8, 10))}</Link> <span className="count">{x.n}</span></li>)}</ul></>; }
  const months = (await archiveMonths()).filter((x) => !y || x.month.startsWith(y)); if (y && !months.length) notFound();
  const years = [...new Set(months.map((x) => x.month.slice(0, 4)))];
  return <><div className="page-head"><span className="kicker">Archivio storico</span><h1>{y ?? 'Tutti gli articoli, per data'}</h1></div>{years.map((yy) => <section key={yy} className="section"><div className="section-title"><h2>{yy}</h2></div><ul className="archive-list">{months.filter((x) => x.month.startsWith(yy)).map((x) => <li key={x.month}><Link href={`/archivio/${x.month.replace('-', '/')}`}>{MONTHS[Number(x.month.slice(5, 7)) - 1]}</Link> <span className="count">{x.n}</span></li>)}</ul></section>)}{months.length === 0 && <p className="help">Nessun articolo pubblicato.</p>}</>;
}
