'use client';
import { useState, useTransition } from 'react';
import { COMMUNITY } from '@/lib/community';
import { confirmLogAction, guessYearAction, submitContributionAction, voteAction } from '@/lib/actions-commons';

async function shrink(file: File, max = 1400): Promise<string> {
  const img = await createImageBitmap(file); const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  let q = 0.82; let out = c.toDataURL('image/jpeg', q); while (out.length > 850_000 && q > 0.4) { q -= 0.12; out = c.toDataURL('image/jpeg', q); } return out;
}
/** Modulo unico per i contributi della comunità: i campi arrivano dalla definizione del tipo, così ogni modulo è coerente e accessibile. */
export function ContributionForm({ kind, refId = '', open = false, extra = {} }: { kind: string; refId?: string; open?: boolean; extra?: Record<string, string> }) {
  const def = COMMUNITY[kind]; const [v, setV] = useState<Record<string, string>>({}); const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null); const [pending, start] = useTransition();
  if (!def) return null;
  if (msg?.ok) return <div className="contrib-done" role="status"><p>{msg.text}</p>{msg.link && <p><b>Il tuo link per segnare «risolto»:</b><br /><code>{msg.link}</code></p>}</div>;
  const form = (
    <form className="contrib-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitContributionAction(kind, refId, { ...extra, ...v }); setMsg({ ok: r.ok, text: r.message ?? '', link: r.link }); }); }}>
      {def.fields.map((f) => { const id = `cf-${kind}-${f.key}`; return <div className="field" key={f.key}><label htmlFor={id}>{f.label}{f.required ? ' *' : ''}</label>
        {f.type === 'textarea' ? <textarea id={id} className="textarea" required={f.required} minLength={f.min} maxLength={f.max} placeholder={f.placeholder} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          : f.type === 'select' ? <select id={id} className="select" required={f.required} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}><option value="">Scegli…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
          : f.type === 'image' ? <><input id={id} type="file" accept="image/*" required={f.required && !v[f.key]} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { setV({ ...v, [f.key]: await shrink(file) }); } catch { setMsg({ ok: false, text: 'Non riesco a leggere questa immagine.' }); } } }} />{v[f.key] && <img src={v[f.key]} alt="Anteprima della foto scelta" className="contrib-preview" />}</>
          : <input id={id} className="input" type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text'} required={f.required} minLength={f.type === 'number' ? undefined : f.min} maxLength={f.type === 'number' ? undefined : f.max} placeholder={f.placeholder} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />}</div>; })}
      {msg && !msg.ok && <p className="form-error" role="alert">{msg.text}</p>}
      <button className="btn btn-primary btn-sm" disabled={pending}>{pending ? 'Invio…' : def.button}</button>
    </form>
  );
  return open ? <section className="contrib-box"><h2>{def.title}</h2>{form}</section> : <details className="contrib-box"><summary>{def.title}</summary>{form}</details>;
}
export function ConfirmLog({ id, count }: { id: string; count: number }) { const [n, setN] = useState(count); const [done, setDone] = useState(false); const [pending, start] = useTransition(); return <button type="button" className="linklike" disabled={pending || done} onClick={() => start(async () => { const r = await confirmLogAction(id); if (r.ok) { setN(n + 1); setDone(true); } })}>{done ? 'Grazie' : 'Confermo anch\'io'}{n > 0 ? ` · ${n}` : ''}</button>; }
export function GuessYear({ id }: { id: string }) { const [y, setY] = useState(''); const [msg, setMsg] = useState(''); const [pending, start] = useTransition(); if (msg) return <span className="help" role="status">{msg}</span>; return <form className="guess-year" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await guessYearAction(id, Number(y)); setMsg(r.message ?? ''); }); }}><label htmlFor={`gy-${id}`}>Secondo te che anno è?</label><input id={`gy-${id}`} type="number" min={1840} max={2100} required value={y} onChange={(e) => setY(e.target.value)} /><button disabled={pending}>Proponi</button></form>; }
export function VoteButtons({ roundId, options, mine, canVote }: { roundId: string; options: { id: string; title: string; desc: string; votes: number; percent: number }[]; mine: string; canVote: boolean }) {
  const [sel, setSel] = useState(mine); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  return <div className="assembly-options">{options.map((o) => <div key={o.id} className={`assembly-opt${sel === o.id ? ' mine' : ''}`}><div><b>{o.title}</b><p>{o.desc}</p><div className="funding-bar"><span style={{ width: `${o.percent}%` }} /></div><span className="help">{o.votes} voti · {o.percent}%</span></div>{canVote && <button type="button" className="btn btn-outline btn-sm" disabled={pending} aria-pressed={sel === o.id} onClick={() => start(async () => { const r = await voteAction(roundId, o.id); setMsg(r.message ?? ''); if (r.ok) setSel(o.id); })}>{sel === o.id ? '✓ Il tuo voto' : 'Voto questa'}</button>}</div>)}{msg && <p className="help" role="status">{msg}</p>}</div>;
}
