import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { articlesByCategory, categoryBySlug, countPublished, getSettings, legacyRedirectFor, topTagsForCategory } from '@/lib/queries';
import { getActiveTheme } from '@/lib/theme-server';
import { CategoryFanpage } from '@/components/site/fanpage/category-fanpage';
import { findPageBySlug } from '@/lib/repo-extra3';
import { ArticleBody } from '@/components/site/article-body';
import { SmartImage } from '@/components/ui/smart-image';

export async function generateMetadata({ params }: PageProps<'/[categorySlug]'>): Promise<Metadata> {
  const { categorySlug } = await params;
  const c = await categoryBySlug(categorySlug);
  if (c) return { title: c.name, description: c.description };
  const pg = await findPageBySlug(categorySlug);
  return pg ? { title: pg.seo.title || pg.title, description: pg.seo.description || pg.excerpt, robots: pg.seo.noIndex ? { index: false } : undefined, alternates: pg.seo.canonical ? { canonical: pg.seo.canonical } : undefined } : {};
}

export default async function CategoryPage({ params, searchParams }: PageProps<'/[categorySlug]'>) {
  const [{ categorySlug }, sp] = await Promise.all([params, searchParams]);
  const c = await categoryBySlug(categorySlug);
  if (!c) {
    const pg = await findPageBySlug(categorySlug);
    if (pg) return (
      <article className={`static-page tpl-${pg.template}`}>
        {pg.template !== 'landing' && <header className="page-head"><h1>{pg.title}</h1>{pg.excerpt && <p className="lead">{pg.excerpt}</p>}</header>}
        {pg.coverImage && <figure className="article-cover"><div className="cover-frame"><SmartImage src={pg.coverImage} alt={pg.title} priority slot="cover" /></div></figure>}
        {pg.template === 'landing' && <h1 className="landing-title">{pg.title}</h1>}
        <ArticleBody html={pg.content} className={pg.template === 'wide' || pg.template === 'landing' ? 'article-body page-wide' : 'article-body page-narrow'} />
      </article>
    );
    const t = await legacyRedirectFor(categorySlug); if (t) permanentRedirect(t); notFound();
  }
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1);
  const perPage = (await getSettings()).articlesPerPage;
  const { theme } = await getActiveTheme();
  const head = page === 1 ? (theme.skin === 'fanpage' ? 9 : c.kind === 'opinion' ? 3 : 4) : 0;
  const [articles, total, topics] = await Promise.all([articlesByCategory(c.id, perPage + head, head + (page - 1) * perPage), countPublished({ categoryId: c.id }), topTagsForCategory(c.id, 6)]);
  if (theme.skin === 'fanpage') return <CategoryFanpage c={c} articles={articles} total={Math.max(0, total - 9)} page={page} perPage={perPage} />;
  const isOpinion = c.kind === 'opinion';
  const hasHero = page === 1 && articles.length >= 4 && !isOpinion;
  const lead = articles[0];
  const rest = page === 1 ? articles.slice(hasHero ? 4 : isOpinion ? 3 : 0) : articles;
  const listTotal = Math.max(0, total - (hasHero ? 4 : isOpinion ? 3 : 0));
  return (
    <>
      <div className="section-head"><h1>{c.name}</h1>{topics.length > 0 && <div className="sub-topics">{topics.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name.toLowerCase()}</Link>)}</div>}<p className="desc">{c.description}</p></div>
      {page === 1 && isOpinion && <div className="opinions-row grid-divided" style={{ marginBottom: 40 }}>{articles.slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} variant="opinion" showExcerpt />)}</div>}
      {hasHero && (
        <>
          <section className="cat-hero"><div className="card card-hero"><div className="card-body"><ArticleCard article={lead} variant="md" showImage={false} showExcerpt /></div></div><ArticleCard article={lead} variant="md" showImage priority showExcerpt={false} /></section>
          <div className="grid grid-3 grid-divided" style={{ marginBottom: 40 }}>{articles.slice(1, 4).map((a) => <ArticleCard key={a.id} article={a} variant="md" />)}</div>
        </>
      )}
      <div className="layout-sidebar"><div><ArticleList articles={rest} total={listTotal} page={page} perPage={perPage} basePath={`/${c.slug}`} /></div><Sidebar /></div>
    </>
  );
}
