import type { Metadata } from 'next';
import Link from 'next/link';
import { articleUrlWith, getCategories, getPublished, getSettings } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';
import { relativeDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Podcast', description: 'Gli articoli da ascoltare: audio-articoli e puntate del podcast della redazione.' };
export const dynamic = 'force-dynamic';
export default async function PodcastPage() {
  const [all, cats, s] = await Promise.all([getPublished(300), getCategories(), getSettings()]);
  const eps = all.filter((a) => a.extra?.audioUrl); const feed = `${siteUrl()}/feed/podcast.xml`;
  return (
    <div className="container" style={{ padding: '24px 20px', maxWidth: 820 }}>
      <div className="section-title"><h1>🎧 Podcast e audio-articoli</h1></div>
      <p className="help">Ascolta le notizie di {s.siteName}. Iscriviti: <a href={`podcast://${feed.replace(/^https?:\/\//, '')}`}>Apple Podcasts</a> · <a href={`https://open.spotify.com/`} target="_blank" rel="noreferrer">Spotify (incolla il feed)</a> · <a href={feed}>Feed RSS</a></p>
      {eps.length === 0 && <p className="help" style={{ marginTop: 16 }}>Nessuna puntata ancora.</p>}
      <div className="podcast-list">{eps.map((a) => <div key={a.id} className="podcast-ep">{a.coverImage && <img src={a.coverImage} alt="" loading="lazy" />}<div><b><Link href={articleUrlWith(a, cats)}>{a.title}</Link></b><div className="help">{relativeDate(a.publishedAt)}{a.extra?.audioDuration ? ` · ${Math.max(1, Math.round(a.extra.audioDuration / 60))} min` : ''}</div><audio controls preload="none" src={a.extra!.audioUrl} style={{ width: '100%', marginTop: 6 }} /></div></div>)}</div>
    </div>
  );
}
