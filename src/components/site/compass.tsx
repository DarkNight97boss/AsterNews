'use client';
import { useEffect, useState } from 'react';
import { compassScore } from '@/lib/civic';

/** Bussola locale: dieci domande sui temi della città; le risposte restano nel browser. */
export function Compass({ themes, candidates }: { themes: { slug: string; question: string; hint: string }[]; candidates: { title: string; slug: string; risposte: string }[] }) {
  const [a, setA] = useState<Record<string, string>>({}); useEffect(() => { try { setA(JSON.parse(localStorage.getItem('aster_compass') ?? '{}')); } catch { /* */ } }, []);
  const set = (k: string, v: string) => { const next = { ...a, [k]: v }; setA(next); try { localStorage.setItem('aster_compass', JSON.stringify(next)); } catch { /* */ } };
  const answered = Object.values(a).filter(Boolean).length; const res = answered ? compassScore(a, candidates) : [];
  return <section className="compass"><h2>Bussola locale</h2><p className="help">Rispondi alle domande sui temi della città e scopri a chi sei più vicino. Le risposte restano nel tuo browser.</p>
    <ol>{themes.map((t) => <li key={t.slug}><p><b>{t.question}</b>{t.hint && <span className="help"> {t.hint}</span>}</p><div className="mind-opts" role="radiogroup" aria-label={t.question}>{[['si', 'Sì'], ['forse', 'Non so'], ['no', 'No']].map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={a[t.slug] === v} className={a[t.slug] === v ? 'on' : ''} onClick={() => set(t.slug, v)}>{l}</button>)}</div></li>)}</ol>
    {answered > 0 && <div className="compass-res"><b>Con {answered} {answered === 1 ? 'risposta' : 'risposte'}:</b><ul>{res.map((r) => <li key={r.slug}><a href={`/schede/candidato/${r.slug}`}>{r.title}</a><div className="funding-bar"><span style={{ width: `${r.percent}%` }} /></div><span>{r.percent}% su {r.total} temi in comune</span></li>)}</ul><button type="button" className="linklike" onClick={() => { setA({}); try { localStorage.removeItem('aster_compass'); } catch { /* */ } }}>Azzera</button></div>}
  </section>;
}
