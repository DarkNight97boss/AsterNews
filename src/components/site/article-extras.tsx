'use client';

import { useEffect, useState } from 'react';
import { incrementViewsAction } from '@/lib/actions';
import { addCommentAction, flagCommentAction } from '@/lib/actions-readers';
import Link from 'next/link';
import { toast } from '@/components/ui/toaster';

export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; setP(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0); };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return <div className="progress-bar" style={{ width: `${p}%` }} />;
}

export function ViewCounter({ id }: { id: string }) {
  useEffect(() => {
    const key = `viewed:${id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    incrementViewsAction(id);
  }, [id]);
  return null;
}

export function ShareBar({ title, withMail = false }: { title: string; withMail?: boolean }) {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(window.location.href), []);
  const u = encodeURIComponent(url); const t = encodeURIComponent(title);
  return (
    <div className="share">
      <a className="share-btn fb" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener" title="Condividi su Facebook">f</a>
      <a className="share-btn x" href={`https://x.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener" title="Condividi su X">𝕏</a>
      <a className="share-btn wa" href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener" title="Condividi su WhatsApp">W</a>
      {withMail && <a className="share-btn mail" href={`mailto:?subject=${t}&body=${u}`} title="Invia via email">✉</a>}
      <button className="share-btn copy" title="Copia link" onClick={() => navigator.clipboard?.writeText(url).then(() => toast.info('Link copiato negli appunti'))}>🔗</button>
    </div>
  );
}

export function Gallery({ images }: { images: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="gallery">{images.map((g, i) => <img key={i} src={g} alt="" loading="lazy" onClick={() => setOpen(g)} />)}</div>
      {open && <div className="lightbox" onClick={() => setOpen(null)}><img src={open} alt="" /></div>}
    </>
  );
}

export function FlagButton({ commentId }: { commentId: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="flag-btn" disabled={done} onClick={async () => { const r = await flagCommentAction(commentId); setDone(true); toast.info(r.message ?? ''); }} title="Segnala alla redazione">{done ? 'Segnalato' : '⚑ Segnala'}</button>;
}

export function CommentForm({ articleId, moderated, readerName = '', requireAccount = false }: { articleId: string; moderated: boolean; readerName?: string; requireAccount?: boolean }) {
  const [f, setF] = useState({ authorName: '', email: '', body: '' });
  const [pending, setPending] = useState(false);
  if (requireAccount && !readerName) return <p className="help" style={{ fontSize: 14 }}>Per commentare <Link href={`/account?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`} style={{ color: 'var(--red)', fontWeight: 700 }}>accedi o crea un account lettore</Link>: è gratis e serve a tenere la discussione civile.</p>;
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setPending(true); const r = await addCommentAction({ articleId, ...f }); setPending(false); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setF({ ...f, body: '' }); }}>
      {readerName ? <p className="help">Commenti come <b>{readerName}</b>.</p> : <div className="form-row">
        <div className="field"><label htmlFor="c-name">Nome</label><input id="c-name" className="input" value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })} required /></div>
        <div className="field"><label htmlFor="c-email">Email (non pubblicata)</label><input id="c-email" className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
      </div>}
      <div className="field"><label htmlFor="c-body">Commento</label><textarea id="c-body" className="textarea" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></div>
      <button className="btn btn-dark" type="submit" disabled={pending}>Invia commento</button>
      {moderated && <span className="help" style={{ marginLeft: 12 }}>I commenti sono moderati prima della pubblicazione.</span>}
    </form>
  );
}
