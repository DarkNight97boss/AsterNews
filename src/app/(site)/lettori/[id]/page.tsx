import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findReader } from '@/lib/repo-extra';
import { readerComments } from '@/lib/repo-extra3';
import { getCategories, getSettings } from '@/lib/queries';
import { findArticle } from '@/lib/repo';
import { relativeDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: PageProps<'/lettori/[id]'>): Promise<Metadata> { const { id } = await params; const r = await findReader(id); return { title: r?.prefs?.public ? `${r.name} · lettore` : 'Lettore', robots: { index: false } }; }

/** Profilo pubblico del lettore (se lo ha attivato): badge, commenti recenti. */
export default async function ReaderProfile({ params }: PageProps<'/lettori/[id]'>) {
  const { id } = await params; const r = await findReader(id); if (!r || !r.prefs?.public || r.banned) notFound();
  const [comments, cats, s] = await Promise.all([readerComments(r.id, 20), getCategories(), getSettings()]);
  const total = comments.length; const badges = [r.verified ? '✅ Verificato' : '', r.premium ? '⭐ Abbonato' : '', total >= 10 ? '💬 Commentatore attivo' : '', new Date(r.createdAt) < new Date(Date.now() - 365 * 86400000) ? '🏅 Lettore da oltre un anno' : ''].filter(Boolean);
  const arts = await Promise.all([...new Set(comments.map((c) => c.articleId))].slice(0, 20).map((aid) => findArticle(aid)));
  const link = (aid: string) => { const a = arts.find((x) => x?.id === aid); if (!a) return null; const c = cats.find((k) => k.id === a.categoryId); return { title: a.title, url: `/${c?.slug ?? 'notizie'}/${a.slug}` }; };
  return (
    <div className="account" style={{ maxWidth: 720 }}>
      <div className="account-card">
        <div className="profile-head">{r.avatar ? <img src={r.avatar} alt="" /> : <span className="avatar-ph">{r.name.slice(0, 1).toUpperCase()}</span>}<div><h1>{r.name || 'Lettore'}</h1><p className="help">Lettore di {s.siteName} dal {new Date(r.createdAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p><div className="chips">{badges.map((b) => <span key={b} className="chip">{b}</span>)}</div></div></div>
        <h2 style={{ marginTop: 20 }}>Commenti recenti</h2>
        {comments.length === 0 && <p className="help">Nessun commento pubblico.</p>}
        {comments.map((c) => { const l = link(c.articleId); return <div key={c.id} className="comment"><div className="c-head"><b>{l ? <Link href={l.url}>{l.title}</Link> : 'Articolo'}</b><span>{relativeDate(c.createdAt)}</span></div><p>{c.body}</p></div>; })}
      </div>
    </div>
  );
}
