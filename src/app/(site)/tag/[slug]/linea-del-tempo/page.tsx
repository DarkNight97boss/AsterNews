import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { timeline } from '@/lib/archive';
import { articleUrlWith, getCategories, tagBySlug } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export async function generateMetadata({ params }: PageProps<'/tag/[slug]/linea-del-tempo'>): Promise<Metadata> { const t = await tagBySlug((await params).slug); return t ? { title: `${t.name}: la linea del tempo`, description: `Tutto quello che il giornale ha scritto su ${t.name}, in ordine cronologico.` } : {}; }
export default async function TagTimeline({ params }: PageProps<'/tag/[slug]/linea-del-tempo'>) {
  const t = await tagBySlug((await params).slug); if (!t) notFound();
  const [list, cats] = await Promise.all([listArticles({ status: 'published', tagId: t.id }, 'published', 1000), getCategories()]); const tl = timeline(list);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href={`/tag/${t.slug}`}>#{t.name}</Link></p><h1>La linea del tempo</h1><p className="lead">{list.length} articoli su {t.name}, dal primo all&apos;ultimo.</p><p className="alpha-nav">{tl.map((y) => <a key={y.year} href={`#y-${y.year}`}>{y.year} <small>({y.n})</small></a>)}</p><div className="tl">{tl.map((y) => <section key={y.year} id={`y-${y.year}`}><h2>{y.year}</h2>{y.months.map((m) => <div key={m.month} className="tl-month"><h3>{MONTHS[Number(m.month.slice(5, 7)) - 1]}</h3><ul>{m.items.map((a) => <li key={a.id}><time dateTime={a.publishedAt ?? ''}>{formatDate(a.publishedAt, false)}</time> <Link href={articleUrlWith(a, cats)}>{a.title}</Link></li>)}</ul></div>)}</section>)}</div></div></div>;
}
