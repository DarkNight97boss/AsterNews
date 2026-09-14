import type { Metadata } from 'next';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/sidebar';
import { getPublished } from '@/lib/queries';

export const metadata: Metadata = { title: 'Tutte le notizie' };

export default function ArchivePage() {
  const all = getPublished();
  return (
    <>
      <div className="page-head"><h1>Tutte le notizie</h1><p>Gli articoli in ordine cronologico. <span className="count">{all.length} articoli</span></p></div>
      <div className="layout-sidebar"><ArticleList articles={all} /><Sidebar /></div>
    </>
  );
}
