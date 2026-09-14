import type { Metadata } from 'next';
import { ArticleCard } from '@/components/site/article-card';
import { getVideos } from '@/lib/queries';

export const metadata: Metadata = { title: 'Video', description: 'Tutti i video: cronaca, politica, sport e spettacolo.' };

export default async function VideoPage() {
  const videos = await getVideos(48);
  return (
    <>
      <div className="section-head"><h1>Video</h1></div>
      {videos.length === 0 ? <div className="empty"><h3>Nessun video</h3></div> : <div className="grid grid-4 grid-divided">{videos.map((a) => <ArticleCard key={a.id} article={a} variant="sm" showMeta />)}</div>}
    </>
  );
}
