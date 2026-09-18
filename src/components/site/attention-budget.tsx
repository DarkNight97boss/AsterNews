'use client';
import { useEffect, useState } from 'react';
import { ATTENTION_KEY, type AttentionEntry } from './attention-tracker';

const LIMIT_KEY = 'aster_attention_limit';
export function AttentionBudget() {
  const [rows, setRows] = useState<AttentionEntry[] | null>(null); const [limit, setLimit] = useState(120);
  useEffect(() => { try { setRows(JSON.parse(localStorage.getItem(ATTENTION_KEY) ?? '[]')); setLimit(Number(localStorage.getItem(LIMIT_KEY)) || 120); } catch { setRows([]); } }, []);
  if (!rows) return <p className="help">Carico il tuo bilancio…</p>;
  const from = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10); const week = rows.filter((r) => r.day >= from); const total = Math.round(week.reduce((n, r) => n + r.sec, 0) / 60);
  const byCat = Object.entries(week.reduce<Record<string, number>>((m, r) => { m[r.cat] = (m[r.cat] ?? 0) + r.sec; return m; }, {})).sort((a, b) => b[1] - a[1]); const pct = Math.min(100, Math.round((total / Math.max(1, limit)) * 100));
  return (
    <div className="attention">
      <p className="attention-total"><b>{total} min</b> negli ultimi 7 giorni, su un tetto di {limit} min che ti sei dato.</p>
      <div className="attention-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${pct}%` }} className={pct >= 100 ? 'over' : ''} /></div>
      {pct >= 100 && <p className="attention-note">Hai raggiunto il tetto che ti eri dato. Le notizie importanti ci saranno anche domani.</p>}
      {byCat.length === 0 ? <p className="help">Ancora nessuna lettura registrata su questo dispositivo.</p> : <ul className="attention-cats">{byCat.map(([c, s]) => <li key={c}><span>{c}</span><b>{Math.max(1, Math.round(s / 60))} min</b></li>)}</ul>}
      <label className="field"><span>Il mio tetto settimanale (minuti)</span><input className="input" type="number" min={10} max={2000} step={10} value={limit} onChange={(e) => { const v = Number(e.target.value) || 120; setLimit(v); try { localStorage.setItem(LIMIT_KEY, String(v)); } catch { /* */ } }} /></label>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { try { localStorage.removeItem(ATTENTION_KEY); } catch { /* */ } setRows([]); }}>Azzera il conteggio</button>
      <p className="help">Questi numeri vivono solo nel tuo browser: non li vediamo e non li usiamo.</p>
    </div>
  );
}
