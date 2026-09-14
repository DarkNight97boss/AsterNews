import type { Metadata } from 'next';
import { ArticleCard } from '@/components/site/article-card';
import { getGalleries } from '@/lib/queries';

export const metadata: Metadata = { title: 'Foto', description: 'Le fotogallery: immagini, reportage e gallerie.' };

export default async function PhotoPage() {
  const galleries = await getGalleries(48);
  return (
    <>
      <div className="section-head"><h1>Foto</h1></div>
      {galleries.length === 0 ? <div className="empty"><h3>Nessuna fotogallery</h3></div> : <div className="grid grid-3 grid-divided">{galleries.map((a) => <ArticleCard key={a.id} article={a} variant="md" showMeta />)}</div>}
    </>
  );
}
