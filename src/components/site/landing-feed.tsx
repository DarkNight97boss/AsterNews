import { ArticleCard } from '@/components/site/article-card';
import { getTags, listPublished } from '@/lib/queries';
export async function LandingFeed({ tagRef, count }: { tagRef: string; count: number }) {
  const tags = await getTags(); const t = tags.find((x) => x.id === tagRef || x.slug === tagRef); if (!t) return null;
  const arts = await listPublished({ tagId: t.id }, Math.min(12, count || 6)); if (!arts.length) return null;
  return <section className="section landing-feed"><div className="section-title"><h2>Gli ultimi articoli</h2><a href={`/tag/${t.slug}`}>Tutti →</a></div><div className="grid grid-3 grid-divided">{arts.map((a) => <ArticleCard key={a.id} article={a} variant="sm" showMeta />)}</div></section>;
}
