import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { articlesByCategory, categoryBySlug, tag } from '@/lib/queries';
import { getActiveTheme } from '@/lib/theme-server';
import { CategoryFanpage } from '@/components/site/fanpage/category-fanpage';

export async function generateMetadata({ params }: PageProps<'/[categorySlug]'>): Promise<Metadata> {
  const { categorySlug } = await params;
  const c = categoryBySlug(categorySlug);
  return c ? { title: c.name, description: c.description } : {};
}

export default async function CategoryPage({ params }: PageProps<'/[categorySlug]'>) {
  const { categorySlug } = await params;
  const c = categoryBySlug(categorySlug);
  if (!c) notFound();
  const articles = articlesByCategory(c.id);
  const { theme } = await getActiveTheme();
  if (theme.skin === 'fanpage') return <CategoryFanpage c={c} articles={articles} />;
  const tagCount = new Map<string, number>();
  articles.forEach((a) => a.tagIds.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)));
  const topics = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => tag(id)).filter((t): t is NonNullable<typeof t> => !!t);
  const isOpinion = c.kind === 'opinion';
  const hasHero = articles.length >= 4 && !isOpinion;
  const lead = articles[0];
  const trio = hasHero ? articles.slice(1, 4) : [];
  const rest = hasHero ? articles.slice(4) : isOpinion ? articles.slice(3) : articles;
  const showList = rest.length > 0 || (!hasHero && !isOpinion);

  return (
    <>
      <div className="section-head">
        <h1>{c.name}</h1>
        {topics.length > 0 && <div className="sub-topics">{topics.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name.toLowerCase()}</Link>)}</div>}
        <p className="desc">{c.description}</p>
      </div>
      {isOpinion && <div className="opinions-row grid-divided" style={{ marginBottom: 40 }}>{articles.slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} variant="opinion" showExcerpt />)}</div>}
      {hasHero && (
        <>
          <section className="cat-hero">
            <div className="card card-hero"><div className="card-body"><ArticleCard article={lead} variant="md" showImage={false} showExcerpt /></div></div>
            <ArticleCard article={lead} variant="md" showImage priority showExcerpt={false} />
          </section>
          <div className="grid grid-3 grid-divided" style={{ marginBottom: 40 }}>{trio.map((a) => <ArticleCard key={a.id} article={a} variant="md" />)}</div>
        </>
      )}
      {showList ? (
        <div className="layout-sidebar"><ArticleList articles={rest} /><Sidebar /></div>
      ) : (
        <div className="layout-sidebar"><div /><Sidebar /></div>
      )}
    </>
  );
}
