'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { askArticleAction, longResponseAction, mindAction } from '@/lib/actions-reading';
import type { Stance } from '@/lib/reading';

export function AskArticle({ articleId }: { articleId: string }) {
  const [q, setQ] = useState(''); const [log, setLog] = useState<{ q: string; a: string }[]>([]); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  return (
    <details className="ask-article"><summary>💬 Fai una domanda a questo articolo</summary><p className="help">Risponde solo con quello che c&apos;è scritto qui: se l&apos;articolo non lo dice, te lo dice.</p>
      {log.map((l, i) => <div key={i} className="ask-turn"><p className="ask-q">{l.q}</p><p className="ask-a">{l.a}</p></div>)}
      <form onSubmit={(e) => { e.preventDefault(); const question = q.trim(); if (question.length < 5) return; start(async () => { const r = await askArticleAction(articleId, question); if (r.ok && r.answer) { setLog((x) => [...x, { q: question, a: r.answer! }]); setQ(''); setErr(''); } else setErr(r.message ?? 'Errore'); }); }}><input className="input" aria-label="La tua domanda" placeholder="es. Quanto costa l'opera?" value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} /><button className="btn btn-outline btn-sm" disabled={pending}>{pending ? '…' : 'Chiedi'}</button></form>
      {err && <p className="form-error" role="alert">{err}</p>}
    </details>
  );
}
const OPTS: { v: Stance; l: string }[] = [{ v: 'si', l: 'Sì' }, { v: 'forse', l: 'Non so' }, { v: 'no', l: 'No' }];
export function MindChange({ articleId, question, stats: initial }: { articleId: string; question: string; stats: { total: number; percent: number } | null }) {
  const [before, setBefore] = useState<Stance | ''>(''); const [after, setAfter] = useState<Stance | ''>(''); const [stats, setStats] = useState(initial); const [done, setDone] = useState(false); const [pending, start] = useTransition(); const key = `aster_mind_${articleId}`;
  useEffect(() => { try { if (localStorage.getItem(key)) setDone(true); } catch { /* */ } }, [key]);
  const Pick = ({ value, set, name }: { value: string; set: (s: Stance) => void; name: string }) => <div className="mind-opts" role="radiogroup" aria-label={name}>{OPTS.map((o) => <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={value === o.v ? 'on' : ''} onClick={() => set(o.v)}>{o.l}</button>)}</div>;
  return (
    <section className="mind-change" aria-label="Ho cambiato idea"><b>{question}</b>
      {done ? <p className="help">Grazie, la tua risposta è contata.</p> : <><div className="mind-row"><span>Prima di leggere pensavo</span><Pick value={before} set={setBefore} name="Prima di leggere" /></div><div className="mind-row"><span>Ora penso</span><Pick value={after} set={setAfter} name="Dopo aver letto" /></div>
        <button type="button" className="btn btn-outline btn-sm" disabled={pending || !before || !after} onClick={() => start(async () => { const r = await mindAction(articleId, before as Stance, after as Stance); if (r.ok) { setDone(true); if (r.stats) setStats(r.stats); try { localStorage.setItem(key, '1'); } catch { /* */ } } })}>Registra</button></>}
      {stats && stats.total >= 5 && <p className="mind-stats"><b>{stats.percent}%</b> dei {stats.total} lettori che hanno risposto ha cambiato idea leggendo.</p>}
    </section>
  );
}
export function AmbientSound({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null); const [on, setOn] = useState(false);
  return <p className="ambient"><button type="button" aria-pressed={on} onClick={() => { const a = ref.current; if (!a) return; if (on) { a.pause(); setOn(false); } else { a.volume = 0.18; a.play().then(() => setOn(true)).catch(() => {}); } }}>{on ? '🔇 Spegni il suono del luogo' : '🔊 Ascolta il suono del luogo mentre leggi'}</button><audio ref={ref} src={url} loop preload="none" /></p>;
}
export function LongResponseForm({ articleId }: { articleId: string }) {
  const [f, setF] = useState({ name: '', email: '', title: '', text: '' }); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition(); const words = f.text.trim().split(/\s+/).filter(Boolean).length;
  if (msg?.ok) return <p className="reply-ask done" role="status">{msg.text}</p>;
  return (
    <details className="reply-ask long-response"><summary>✍️ Non un commento: scrivi una risposta vera</summary><p className="help">Almeno 120 parole, con un titolo e il tuo nome. Se la redazione la pubblica, compare accanto all&apos;articolo.</p>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await longResponseAction(articleId, f); setMsg({ ok: r.ok, text: r.message ?? '' }); }); }}>
        <div className="form-row"><input className="input" required placeholder="Nome e cognome" aria-label="Il tuo nome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input className="input" type="email" required placeholder="Email (non pubblicata)" aria-label="La tua email per la risposta" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <input className="input" required placeholder="Titolo della tua risposta" aria-label="Titolo della risposta" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="textarea" required style={{ minHeight: 200 }} aria-label="Testo della risposta" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /><span className="help">{words} parole</span>
        {msg && !msg.ok && <p className="form-error" role="alert">{msg.text}</p>}<button className="btn btn-outline btn-sm" disabled={pending || words < 120}>{pending ? 'Invio…' : 'Invia alla redazione'}</button>
      </form>
    </details>
  );
}
