import type { Metadata } from 'next';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { countPublished, getPublished, getSettings } from '@/lib/queries';

export const metadata: Metadata = { title: 'Tutte le notizie' };
export default async function ArchivePage({ searchParams }: PageProps<'/notizie'>) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1); const perPage = (await getSettings()).articlesPerPage;
  const [articles, total] = await Promise.all([getPublished(perPage, (page - 1) * perPage), countPublished()]);
  return <><div className="page-head"><h1>Tutte le notizie</h1><p>Gli articoli in ordine cronologico. <span className="count">{total} articoli</span></p></div><div className="layout-sidebar"><div><ArticleList articles={articles} total={total} page={page} perPage={perPage} basePath="/notizie" /></div><Sidebar /></div></>;
}
