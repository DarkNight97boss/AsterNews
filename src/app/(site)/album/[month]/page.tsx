import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listArticles } from '@/lib/repo';
import { getSettings } from '@/lib/queries';
import { monthAlbum } from '@/lib/formats';

export const revalidate = 3600;
export async function generateMetadata({ params }: PageProps<'/album/[month]'>): Promise<Metadata> { const { month } = await params; return { title: `Album di ${new Date(`${month}-01T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}` }; }
export default async function AlbumPage({ params }: PageProps<'/album/[month]'>) {
  const { month } = await params; if (!/^\d{4}-\d{2}$/.test(month)) notFound(); const [arts, s] = await Promise.all([listArticles({ status: 'published', from: `${month}-01`, to: `${month}-31T23:59:59` }, 'published', 300), getSettings()]); const imgs = monthAlbum(arts, month); if (!imgs.length) notFound();
  return <div className="album"><p className="pe-hint">Stampa in A3 (Ctrl/Cmd+P): scegli il formato A3 nella finestra di stampa.</p><header><h1>{s.siteName}</h1><p>Album di {new Date(`${month}-01T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p></header><div className="album-grid">{imgs.map((i) => <figure key={i.url}><img src={i.url} alt={i.caption} loading="lazy" /><figcaption>{i.caption}<span>{new Date(i.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span></figcaption></figure>)}</div></div>;
}
