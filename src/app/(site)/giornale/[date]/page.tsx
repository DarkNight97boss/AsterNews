import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { frontPage } from '@/lib/archive';
import { archiveDays } from '@/lib/insights';
import { getCategories, getSettings } from '@/lib/queries';
import { listArticles } from '@/lib/repo';

export const dynamic = 'force-dynamic';
const label = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export async function generateMetadata({ params }: PageProps<'/giornale/[date]'>): Promise<Metadata> { const { date } = await params; return { title: `Il giornale di ${label(date)}`, description: `La prima pagina di ${label(date)}, ricostruita dall'archivio.` }; }
export default async function DayPaper({ params }: PageProps<'/giornale/[date]'>) {
  const { date } = await params; if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const [list, cats, s] = await Promise.all([listArticles({ status: 'published', from: `${date}T00:00:00.000Z`, to: `${date}T23:59:59.999Z` }, 'published', 200), getCategories(), getSettings()]);
  const days = (await archiveDays(date.slice(0, 7))).map((d) => d.day).sort(); const i = days.indexOf(date); const prev = i > 0 ? days[i - 1] : null; const next = i >= 0 && i < days.length - 1 ? days[i + 1] : null;
  const fp = frontPage(list);
  return <div className="day-paper"><header className="day-mast"><p className="help"><Link href="/giornale">Un giorno qualsiasi</Link></p><h1>{s.siteName}</h1><p className="day-date">{label(date)}{list.length ? ` · ${list.length} articoli` : ''}</p><nav className="day-nav">{prev && <Link href={`/giornale/${prev}`}>← {prev}</Link>}<Link href="/giornale?caso">un altro giorno a caso</Link>{next && <Link href={`/giornale/${next}`}>{next} →</Link>}</nav></header>
    {!fp.lead ? <p className="help" style={{ textAlign: 'center' }}>Quel giorno non uscì nulla. <Link href={`/archivio/${date.slice(0, 4)}/${date.slice(5, 7)}`}>Guarda il mese</Link>.</p> : <><div className="day-lead"><ArticleCard article={fp.lead} variant="hero" showExcerpt showMeta priority /></div>{fp.sections.map((sec) => <section key={sec.categoryId} className="section"><div className="section-title"><h2>{cats.find((c) => c.id === sec.categoryId)?.name ?? 'Altro'}</h2></div><div className="list-divided">{sec.items.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" showExcerpt showMeta />)}</div></section>)}</>}
  </div>;
}
