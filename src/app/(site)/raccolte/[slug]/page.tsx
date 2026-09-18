import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { collectionArticles, personalLists } from '@/lib/actions-personal';
import { articleUrlWith, getCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';
const load = async (slug: string) => (await personalLists()).collections.find((c) => c.data.slug === slug);
export async function generateMetadata({ params }: PageProps<'/raccolte/[slug]'>): Promise<Metadata> { const c = await load((await params).slug); return c ? { title: c.data.title, description: c.data.intro } : {}; }
export default async function CollectionPage({ params }: PageProps<'/raccolte/[slug]'>) {
  const c = await load((await params).slug); if (!c) notFound(); const [arts, cats] = await Promise.all([collectionArticles(c.data.query), getCategories()]); const years = [...new Set(arts.map((a) => (a.publishedAt ?? '').slice(0, 4)))].filter(Boolean);
  return (
    <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><p className="kicker"><Link href="/raccolte">Raccolte</Link></p><h1>{c.data.title}</h1><p className="lead">{c.data.intro}</p>
      {c.data.evolution && <section className="evolution"><b>Come è cambiato nel tempo</b><p>{c.data.evolution}</p></section>}
      <p className="help">{arts.length} testi, dal {years[0]} al {years[years.length - 1]} · <a href={`/api/export/libro?raccolta=${c.data.slug}&formato=epub`} rel="nofollow">scarica come libro (EPUB)</a> · <a href={`/api/export/libro?raccolta=${c.data.slug}&formato=html`} rel="nofollow" target="_blank">versione da stampare in PDF</a></p>
      {years.map((y) => <section key={y}><h2>{y}</h2><ul className="trust-list">{arts.filter((a) => (a.publishedAt ?? '').startsWith(y)).map((a) => <li key={a.id}><time dateTime={a.publishedAt ?? ''}>{new Date(a.publishedAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</time><div><Link href={articleUrlWith(a, cats)}>{a.title}</Link><p>{a.excerpt || a.subtitle}</p></div></li>)}</ul></section>)}
    </div></div>
  );
}
