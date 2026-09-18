import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSettings, getTags } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { ArticleCard } from '@/components/site/article-card';

export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> { const ev = (await getSettings()).personal?.eventMode; return ev?.title ? { title: ev.title, description: ev.intro } : {}; }
/** Modalità evento: per qualche giorno il sito ruota attorno a un festival o a un'emergenza. Finito il periodo resta come capitolo consultabile. */
export default async function EventModePage() {
  const ev = (await getSettings()).personal?.eventMode; if (!ev?.title || !ev.tagId) notFound(); const [arts, tags] = await Promise.all([listArticles({ status: 'published', tagId: ev.tagId }, 'published', 60), getTags()]); const over = !ev.enabled || +new Date(ev.until) < Date.now(); const live = arts.filter((a) => a.format === 'live' && a.liveActive);
  return <div className="container event-mode"><div className="page-head"><span className="kicker">{over ? 'Capitolo concluso' : 'Speciale in corso'}</span><h1>{ev.title}</h1><p>{ev.intro} <span className="count">{arts.length} articoli · #{tags.find((t) => t.id === ev.tagId)?.name}</span></p></div>{live.length > 0 && <section className="section"><div className="section-title"><h2>In diretta</h2></div><div className="grid grid-2">{live.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" showMeta />)}</div></section>}<div className="grid grid-3">{arts.filter((a) => !live.includes(a)).map((a) => <ArticleCard key={a.id} article={a} showMeta />)}</div></div>;
}
