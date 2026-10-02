import type { Metadata } from 'next';
import Link from 'next/link';
import { listArticles } from '@/lib/repo';

export const metadata: Metadata = { title: 'Album fotografici', description: 'Le foto migliori di ogni mese, sfogliabili e stampabili.' };
export const revalidate = 3600;
export default async function AlbumsIndex() { const arts = await listArticles({ status: 'published' }, 'published', 600); const months = [...new Set(arts.filter((a) => a.coverImage || a.gallery.length).map((a) => (a.publishedAt ?? '').slice(0, 7)))].filter(Boolean).sort().reverse(); return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Album fotografici</h1><p className="lead">Un mese, una pagina di foto. Da sfogliare o da stampare in A3.</p><ul className="hub-grid">{months.map((m) => <li key={m}><Link href={`/album/${m}`}>{new Date(`${m}-01T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</Link></li>)}</ul></div></div>; }
