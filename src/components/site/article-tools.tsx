'use client';

import { useEffect, useState } from 'react';
import { reportArticleErrorAction } from '@/lib/actions-engage';

/** Strumenti del lettore sotto il titolo: lettura senza distrazioni (ricordata), segnalazione di un errore, audio in coda. */
export function ArticleTools({ articleId, title, url, audioUrl }: { articleId: string; title: string; url: string; audioUrl?: string }) {
  const [reading, setReading] = useState(false); const [open, setOpen] = useState(false); const [quote, setQuote] = useState(''); const [note, setNote] = useState(''); const [msg, setMsg] = useState(''); const [queued, setQueued] = useState(false);
  useEffect(() => { try { const on = localStorage.getItem('reading_mode') === '1'; setReading(on); document.documentElement.dataset.reading = on ? '1' : ''; } catch { /* ignora */ } return () => { document.documentElement.dataset.reading = ''; }; }, []);
  const toggle = () => { const on = !reading; setReading(on); document.documentElement.dataset.reading = on ? '1' : ''; try { localStorage.setItem('reading_mode', on ? '1' : '0'); } catch { /* ignora */ } };
  return (
    <div className="article-tools">
      <button type="button" className={`tool-btn ${reading ? 'on' : ''}`} onClick={toggle} aria-pressed={reading}>{reading ? '✕ Esci dalla lettura' : '📖 Lettura senza distrazioni'}</button>
      {audioUrl && <button type="button" className="tool-btn" disabled={queued} onClick={() => { window.dispatchEvent(new CustomEvent('aster:queue', { detail: { title, url, src: audioUrl } })); setQueued(true); }}>{queued ? '✔ In coda di ascolto' : '＋ Ascolta dopo'}</button>}
      <button type="button" className="tool-btn" onClick={() => { setQuote((window.getSelection()?.toString() ?? '').trim().slice(0, 300)); setOpen(!open); setMsg(''); }}>✎ Hai trovato un errore?</button>
      {open && <form className="error-report" onSubmit={async (e) => { e.preventDefault(); const r = await reportArticleErrorAction(articleId, quote, note); setMsg(r.message ?? ''); if (r.ok) { setNote(''); setTimeout(() => setOpen(false), 2500); } }}>
        {quote ? <blockquote>«{quote}»</blockquote> : <p className="help">Suggerimento: seleziona la frase sbagliata prima di premere il pulsante.</p>}
        <textarea className="textarea" required placeholder="Cosa non torna? (un nome, una data, un refuso…)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="actions"><button className="btn btn-dark btn-sm">Invia alla redazione</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Annulla</button></div>{msg && <p className="help">{msg}</p>}
      </form>}
    </div>
  );
}
