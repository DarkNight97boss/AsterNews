'use client';

import { useEffect, useState } from 'react';
import { addCommentAction, incrementViewsAction } from '@/lib/actions';
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

export function ShareBar({ title }: { title: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(window.location.href), []);
  const u = encodeURIComponent(url); const t = encodeURIComponent(title);
  return (
    <div className="share">
      <a className="share-btn" href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener" title="Condividi su Facebook">f</a>
      <a className="share-btn" href={`https://x.com/intent/tweet?url=${u}&text=${t}`} target="_blank" rel="noopener" title="Condividi su X">𝕏</a>
      <a className="share-btn" href={`https://wa.me/?text=${t}%20${u}`} target="_blank" rel="noopener" title="Condividi su WhatsApp">W</a>
      <button className="share-btn" title="Copia link" onClick={() => navigator.clipboard?.writeText(url).then(() => toast.info('Link copiato negli appunti'))}>🔗</button>
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

export function CommentForm({ articleId, moderated }: { articleId: string; moderated: boolean }) {
  const [f, setF] = useState({ authorName: '', email: '', body: '' });
  const [pending, setPending] = useState(false);
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setPending(true); const r = await addCommentAction({ articleId, ...f }); setPending(false); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setF({ ...f, body: '' }); }}>
      <div className="form-row">
        <div className="field"><label>Nome</label><input className="input" value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })} required /></div>
        <div className="field"><label>Email (non pubblicata)</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>
      </div>
      <div className="field"><label>Commento</label><textarea className="textarea" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required /></div>
      <button className="btn btn-dark" type="submit" disabled={pending}>Invia commento</button>
      {moderated && <span className="help" style={{ marginLeft: 12 }}>I commenti sono moderati prima della pubblicazione.</span>}
    </form>
  );
}
