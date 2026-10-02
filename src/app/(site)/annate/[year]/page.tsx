import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { archiveMonths } from '@/lib/insights';
import { listArticles } from '@/lib/repo';

export const dynamic = 'force-dynamic';
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export async function generateMetadata({ params }: PageProps<'/annate/[year]'>): Promise<Metadata> { const { year } = await params; return { title: `L'annata ${year}`, description: `Il ${year} del giornale, mese per mese, con i pezzi più letti.` }; }
export default async function YearPage({ params }: PageProps<'/annate/[year]'>) {
  const { year } = await params; if (!/^\d{4}$/.test(year)) notFound(); const months = (await archiveMonths()).filter((m) => m.month.startsWith(year)).sort((a, b) => a.month.localeCompare(b.month)); if (!months.length) notFound();
  const tops = await Promise.all(months.map((m) => listArticles({ status: 'published', from: `${m.month}-01T00:00:00.000Z`, to: `${m.month}-31T23:59:59.999Z` }, 'views', 3)));
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/annate">Le annate</Link></p><h1>{year}</h1><p className="lead">{months.reduce((s, m) => s + m.n, 0)} articoli in {months.length} mesi.</p>{months.map((m, i) => <section key={m.month}><h2><Link href={`/archivio/${year}/${m.month.slice(5, 7)}`}>{MONTHS[Number(m.month.slice(5, 7)) - 1]}</Link> <span className="count">{m.n}</span></h2><div className="list-divided">{tops[i].map((a) => <ArticleCard key={a.id} article={a} variant="horizontal-sm" showMeta />)}</div></section>)}<p className="help"><Link href={`/annate/${Number(year) - 1}`}>← {Number(year) - 1}</Link> · <Link href={`/annate/${Number(year) + 1}`}>{Number(year) + 1} →</Link></p></div></div>;
}
