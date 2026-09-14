import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { articlesByTag, countPublished, getSettings, tagBySlug } from '@/lib/queries';

export async function generateMetadata({ params }: PageProps<'/tag/[slug]'>): Promise<Metadata> { const { slug } = await params; return { title: `#${(await tagBySlug(slug))?.name ?? slug}` }; }
export default async function TagPage({ params, searchParams }: PageProps<'/tag/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const t = await tagBySlug(slug);
  if (!t) notFound();
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1); const perPage = (await getSettings()).articlesPerPage;
  const [articles, total] = await Promise.all([articlesByTag(t.id, perPage, (page - 1) * perPage), countPublished({ tagId: t.id })]);
  return <><div className="page-head"><span className="kicker">Argomento</span><h1>#{t.name}</h1><p><span className="count">{total} articoli</span></p></div><div className="layout-sidebar"><div><ArticleList articles={articles} total={total} page={page} perPage={perPage} basePath={`/tag/${t.slug}`} /></div><Sidebar /></div></>;
}
