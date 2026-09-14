import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/sidebar';
import { articlesByTag, tagBySlug } from '@/lib/queries';

export async function generateMetadata({ params }: PageProps<'/tag/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  return { title: `#${tagBySlug(slug)?.name ?? slug}` };
}

export default async function TagPage({ params }: PageProps<'/tag/[slug]'>) {
  const { slug } = await params;
  const t = tagBySlug(slug);
  if (!t) notFound();
  const articles = articlesByTag(t.id);
  return (
    <>
      <div className="page-head"><span className="kicker">Argomento</span><h1>#{t.name}</h1><p><span className="count">{articles.length} articoli</span></p></div>
      <div className="layout-sidebar"><ArticleList articles={articles} /><Sidebar /></div>
    </>
  );
}
