import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/sidebar';
import { articlesByCategory, categoryBySlug } from '@/lib/queries';

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
  const hasHero = articles.length >= 3;
  return (
    <>
      <div className="page-head" style={{ ['--section-color' as string]: c.color }}>
        <h1>{c.name}</h1>
        <p>{c.description} <span className="count">· {articles.length} articoli</span></p>
      </div>
      {hasHero && (
        <section className="hero" style={{ marginBottom: 32 }}>
          <ArticleCard article={articles[0]} variant="hero-overlay" showExcerpt priority />
          <div className="hero-side">{articles.slice(1, 3).map((a) => <ArticleCard key={a.id} article={a} variant="md" />)}</div>
        </section>
      )}
      <div className="layout-sidebar"><ArticleList articles={hasHero ? articles.slice(3) : articles} /><Sidebar /></div>
    </>
  );
}
