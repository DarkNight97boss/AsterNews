'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import { addSeedAction, deleteDatumAction, deleteSeedAction, logSessionAction, saveDatumAction, seedsToDraftAction } from '@/lib/actions-writing';
import type { LiveDatum } from '@/lib/writing';

export function SeedBox({ seeds, themes }: { seeds: { id: string; text: string; createdAt: string }[]; themes: { theme: string; ids: string[] }[] }) {
  const [text, setText] = useState(''); const [pending, start] = useTransition(); const router = useRouter();
  const add = () => start(async () => { const r = await addSeedAction(text); if (r.ok) { setText(''); router.refresh(); } else toast.error(r.message ?? ''); });
  return (
    <div className="panel"><div className="panel-title">Appunti che maturano</div>
      <div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="Un'idea, una frase sentita, un numero da controllare…" aria-label="Nuovo appunto" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) add(); }} /><button type="button" className="btn btn-outline btn-sm" disabled={pending || text.trim().length < 4} onClick={add}>Annota</button></div>
      {themes.map((t) => <div key={t.theme} className="ripe"><b>Hai {t.ids.length} appunti su «{t.theme}…». È un articolo?</b> <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await seedsToDraftAction(t.ids, t.theme); if (r.ok && r.id) router.push(`/admin/articoli/${r.id}`); else toast.error(r.message ?? ''); })}>Crea la bozza</button></div>)}
      <ul className="seed-list">{seeds.length === 0 && <li className="help">Nessun appunto. Quando ne avrai tre sullo stesso tema te lo diremo.</li>}{seeds.map((s) => <li key={s.id}><span>{s.text}</span><span className="help">{new Date(s.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span><button type="button" className="icon-btn danger" aria-label="Elimina appunto" onClick={() => start(async () => { await deleteSeedAction(s.id); router.refresh(); })}>✕</button></li>)}</ul>
    </div>
  );
}
export function SessionTimer({ current, best, weekWords, weekMinutes }: { current: number; best: number; weekWords: number; weekMinutes: number }) {
  const [goal, setGoal] = useState(25); const [left, setLeft] = useState<number | null>(null); const [words, setWords] = useState(''); const [done, setDone] = useState(false); const [pending, start] = useTransition(); const router = useRouter(); const startedAt = useRef(0);
  useEffect(() => { if (left === null || left <= 0) return; const t = setTimeout(() => setLeft((x) => (x === null ? null : x - 1)), 1000); return () => clearTimeout(t); }, [left]);
  useEffect(() => { if (left === 0) setDone(true); }, [left]);
  const minutes = () => Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
  return (
    <div className="panel"><div className="panel-title">Sessioni di scrittura</div>
      <div className="stats" style={{ marginBottom: 10 }}><div className="stat"><div className="stat-label">Giorni di fila</div><div className="stat-value">{current}</div></div><div className="stat"><div className="stat-label">Serie migliore</div><div className="stat-value">{best}</div></div><div className="stat"><div className="stat-label">Ultimi 7 giorni</div><div className="stat-value">{weekMinutes}′ <small>{weekWords} parole</small></div></div></div>
      {left === null ? <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><label htmlFor="ses-goal" className="help">Minuti</label><input id="ses-goal" className="input" type="number" min={5} max={180} style={{ maxWidth: 90 }} value={goal} onChange={(e) => setGoal(Number(e.target.value) || 25)} /><button type="button" className="btn btn-primary btn-sm" onClick={() => { startedAt.current = Date.now(); setDone(false); setLeft(goal * 60); }}>Inizia</button></div>
        : <div className="session-run"><b className="session-clock" aria-live="off">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</b>{done && <span className="help">Tempo! Quante parole hai scritto?</span>}<input className="input" type="number" min={0} style={{ maxWidth: 110 }} placeholder="Parole" aria-label="Parole scritte" value={words} onChange={(e) => setWords(e.target.value)} /><button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await logSessionAction(Number(words) || 0, minutes()); (r.ok ? toast.success : toast.error)(r.message ?? ''); setLeft(null); setWords(''); router.refresh(); })}>Chiudi e registra</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setLeft(null)}>Annulla</button></div>}
      <p className="help" style={{ marginTop: 8 }}>Le sessioni le vedi solo tu: niente classifiche.</p>
    </div>
  );
}
export function LiveDataManager({ data, usage }: { data: LiveDatum[]; usage: Record<string, number> }) {
  const empty: LiveDatum = { key: '', label: '', value: '', source: '', updatedAt: '' }; const [d, setD] = useState<LiveDatum>(empty); const [pending, start] = useTransition(); const router = useRouter();
  return (
    <div className="panel"><div className="panel-title">Numeri collegati alla fonte</div><p className="help">Scrivi <code>{'{{dato:chiave}}'}</code> in un articolo: quando aggiorni il valore qui, cambia ovunque, con fonte e data al passaggio del mouse.</p>
      <table className="table"><tbody>{data.map((x) => <tr key={x.key}><td><code>{`{{dato:${x.key}}}`}</code></td><td className="t-title">{x.value}<div className="help">{x.label}{x.source ? ` · ${x.source}` : ''}</div></td><td className="help">{usage[x.key] ?? 0} articoli</td><td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setD(x)}>Aggiorna</button><button type="button" className="icon-btn danger" aria-label={`Elimina ${x.key}`} onClick={() => start(async () => { await deleteDatumAction(x.key); router.refresh(); })}>✕</button></td></tr>)}{data.length === 0 && <tr><td className="help">Nessun dato ancora.</td></tr>}</tbody></table>
      <div className="form-row" style={{ marginTop: 8 }}><input className="input" placeholder="chiave (es. residenti)" aria-label="Chiave" value={d.key} onChange={(e) => setD({ ...d, key: e.target.value })} /><input className="input" placeholder="Valore (es. 48.312)" aria-label="Valore" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} /></div>
      <div className="form-row" style={{ marginTop: 6 }}><input className="input" placeholder="Cosa misura" aria-label="Descrizione" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} /><input className="input" placeholder="Fonte (es. ISTAT, gennaio 2026)" aria-label="Fonte" value={d.source} onChange={(e) => setD({ ...d, source: e.target.value })} /></div>
      <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }} disabled={pending || !d.key.trim() || !d.value.trim()} onClick={() => start(async () => { const r = await saveDatumAction(d); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setD(empty); router.refresh(); } })}>Salva dato</button>
    </div>
  );
}
