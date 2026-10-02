'use client';
import { useEffect, useState, useTransition } from 'react';
import { delibStatsAction, delibVoteAction } from '@/lib/actions-service';
import type { shiftStats } from '@/lib/service';

type Stats = ReturnType<typeof shiftStats>;
const voter = () => { try { let v = localStorage.getItem('aster_voter'); if (!v) { v = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); localStorage.setItem('aster_voter', v); } return v; } catch { return 'anon' + Date.now().toString(36); } };
/** Sondaggio deliberativo: voti, leggi le ragioni di entrambe le parti, rivoti. Si pubblica quanti hanno cambiato idea. */
export function Deliberation({ articleId, d }: { articleId: string; d: { question: string; pro: string; contro: string } }) {
  const key = `delib_${articleId}`; const [stage, setStage] = useState<'before' | 'read' | 'after' | 'done'>('before'); const [first, setFirst] = useState<string>(''); const [stats, setStats] = useState<Stats | null>(null); const [pending, start] = useTransition();
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(key) ?? 'null') as { stage: typeof stage; first: string } | null; if (s) { setStage(s.stage); setFirst(s.first); if (s.stage === 'done') delibStatsAction(articleId).then(setStats); } } catch { /* */ } }, [key, articleId]);
  const save = (st: typeof stage, f = first) => { try { localStorage.setItem(key, JSON.stringify({ stage: st, first: f })); } catch { /* */ } setStage(st); };
  const vote = (s: 'before' | 'after', v: 'si' | 'no') => start(async () => { const r = await delibVoteAction(articleId, voter(), s, v); if (!r.ok) return; if (s === 'before') { setFirst(v); save('read', v); } else { setStats(r.stats ?? null); save('done'); } });
  const pct = (m: Record<string, number>, k: string) => { const t = (m.si ?? 0) + (m.no ?? 0); return t ? Math.round(100 * (m[k] ?? 0) / t) : 0; };
  return <section className="delib" aria-label="Sondaggio deliberativo"><p className="delib-k">Sondaggio deliberativo</p><h3>{d.question}</h3>
    {stage === 'before' && <><p className="help">Prima rispondi d&apos;istinto. Poi leggi le ragioni delle due parti e rispondi di nuovo: contiamo quanti cambiano idea.</p><div className="delib-btns"><button type="button" className="btn btn-outline" disabled={pending} onClick={() => vote('before', 'si')}>Sì</button><button type="button" className="btn btn-outline" disabled={pending} onClick={() => vote('before', 'no')}>No</button></div></>}
    {stage === 'read' && <><p className="help">Hai risposto <b>{first}</b>. Ora le ragioni:</p><div className="delib-args"><div><b>Le ragioni del sì</b><p>{d.pro || '—'}</p></div><div><b>Le ragioni del no</b><p>{d.contro || '—'}</p></div></div><button type="button" className="btn btn-dark btn-sm" onClick={() => save('after')}>Ho letto, rispondo di nuovo</button></>}
    {stage === 'after' && <div className="delib-btns"><button type="button" className="btn btn-outline" disabled={pending} onClick={() => vote('after', 'si')}>Sì</button><button type="button" className="btn btn-outline" disabled={pending} onClick={() => vote('after', 'no')}>No</button></div>}
    {stage === 'done' && stats && <div className="delib-res"><p><b>{stats.n}</b> {stats.n === 1 ? 'persona ha' : 'persone hanno'} risposto. Prima di leggere: sì {pct(stats.before, 'si')}% · no {pct(stats.before, 'no')}%. Dopo: sì {pct(stats.after, 'si')}% · no {pct(stats.after, 'no')}%.</p><p>{stats.completed ? <>Ha cambiato idea il <b>{Math.round(100 * stats.changed / stats.completed)}%</b> di chi ha letto le ragioni.</> : 'Nessuno ha ancora completato il secondo voto.'}</p><div className="delib-args"><div><b>Le ragioni del sì</b><p>{d.pro || '—'}</p></div><div><b>Le ragioni del no</b><p>{d.contro || '—'}</p></div></div></div>}
  </section>;
}
