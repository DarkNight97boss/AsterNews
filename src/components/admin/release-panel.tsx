'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { releaseNowAction, rollbackAction, saveMaintenanceAction } from '@/lib/actions-release';
import { toast } from '@/components/ui/toaster';

type State = { local: boolean; branch: string; head: string; dirty: number; pending: { hash: string; subject: string; date: string }[]; check: { at: string; commit: string; ok: boolean; fast: boolean; results: { name: string; ok: boolean; seconds: number; summary: string }[] } | null };
type Dep = { uid: string; url: string; createdAt: number; commit: string; message: string; current: boolean };
/** Rilascio controllato: cosa è in attesa, esito dei controlli, pubblicazione, ripristino, manutenzione. */
export function ReleasePanel({ state, deployments, deployError, perf, maintenance, hasHook }: { state: State; deployments: Dep[]; deployError: string; perf: { url: string; performance: number; at: string }[]; maintenance: { enabled: boolean; message: string }; hasHook: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [m, setM] = useState(maintenance);
  const checkFresh = !!state.check && state.check.commit === state.head && state.check.ok && !state.check.fast;
  const ready = state.pending.length > 0 && state.dirty === 0 && checkFresh;
  return (
    <>
      <div className="page-title"><div><h1>Rilascio</h1><p>Le modifiche restano in locale finché non decidi tu. Qui vedi cosa è in attesa, se i controlli sono passati e puoi pubblicare o tornare indietro.</p></div></div>
      {!state.local && <div className="lock-banner">Questa è l&apos;installazione in produzione (commit {state.head || 'n/d'}): i commit in attesa e la pubblicazione si gestiscono dall&apos;installazione locale. Qui restano disponibili ripristino e manutenzione.</div>}
      <div className="admin-grid-2">
        <div>
          {state.local && <div className="panel"><div className="panel-title">In attesa di rilascio ({state.pending.length})</div>
            {state.pending.length === 0 ? <p className="help">Nessun commit locale da pubblicare: produzione e locale sono allineati.</p> : <ul className="activity">{state.pending.map((c) => <li key={c.hash}><span><code>{c.hash}</code></span><div>{c.subject}<div className="help">{new Date(c.date).toLocaleString('it-IT')}</div></div></li>)}</ul>}
            {state.dirty > 0 && <p className="error-text">{state.dirty} file modificati non ancora in un commit: non verrebbero rilasciati.</p>}
          </div>}
          {state.local && <div className="panel"><div className="panel-title">Controlli pre-rilascio</div>
            {!state.check ? <p className="help">Mai eseguiti. Dal terminale: <code>npm run release:check</code> (tipi, test, end-to-end in ambiente isolato; circa 2 minuti).</p> : <>
              <ul className="activity">{state.check.results.map((r) => <li key={r.name}><span>{r.ok ? '✅' : '❌'}</span><div><b>{r.name}</b> <span className="help">· {r.seconds}s · {r.summary}</span></div></li>)}</ul>
              <p className="help">Eseguiti il {new Date(state.check.at).toLocaleString('it-IT')} sul commit <code>{state.check.commit}</code>{state.check.fast ? ' (versione veloce, senza end-to-end: non basta per rilasciare)' : ''}.{state.check.commit !== state.head && <b style={{ color: 'var(--red)' }}> Il codice è cambiato da allora: riesegui i controlli.</b>}</p></>}
            {perf.length > 0 && <p className="help">Ultimo PageSpeed mobile: {perf.map((p) => `${p.url} ${p.performance}`).join(' · ')}</p>}
          </div>}
          {state.local && <div className="panel"><div className="panel-title">Pubblica</div>
            <ul className="activity"><li><span>{state.pending.length > 0 ? '✅' : '⬜️'}</span><div>Ci sono commit da rilasciare</div></li><li><span>{state.dirty === 0 ? '✅' : '⬜️'}</span><div>Nessun file fuori dai commit</div></li><li><span>{checkFresh ? '✅' : '⬜️'}</span><div>Controlli completi passati sull&apos;ultimo commit</div></li></ul>
            <button className="btn btn-primary" disabled={pending || !ready} onClick={() => { if (!confirm(`Pubblicare ${state.pending.length} commit su GitHub e avviare il deploy in produzione?`)) return; start(async () => { const r = await releaseNowAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); }); }}>🚀 Rilascia in produzione</button>
            {!ready && <p className="help" style={{ marginTop: 6 }}>Il pulsante si attiva quando le tre condizioni sono verdi.</p>}
            <p className="help">Il rilascio fa <code>git push</code> su main{hasHook ? ' e chiama il Deploy Hook di Vercel' : '; Vercel pubblica da solo se il repository è collegato'}.</p>
          </div>}
        </div>
        <div>
          <div className="panel"><div className="panel-title">Ripristino con un clic</div>
            {deployError ? <p className="help">{deployError}</p> : deployments.length === 0 ? <p className="help">Nessun deploy trovato.</p> : <table className="table"><tbody>{deployments.map((d) => <tr key={d.uid}><td><code>{d.commit || d.uid.slice(0, 8)}</code><div className="t-sub">{d.message.slice(0, 70)}</div></td><td className="help">{new Date(d.createdAt).toLocaleString('it-IT')}</td><td>{d.current ? <span className="badge badge-green">in produzione</span> : <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => { if (!confirm('Riportare la produzione a questa versione? I dati non cambiano, solo il codice.')) return; start(async () => { const r = await rollbackAction(d.uid); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); }); }}>Ripristina</button>}</td></tr>)}</tbody></table>}
          </div>
          <div className="panel"><div className="panel-title">Modalità manutenzione</div>
            <label className="switch"><input type="checkbox" checked={m.enabled} onChange={(e) => setM({ ...m, enabled: e.target.checked })} /> Sito in manutenzione (la redazione continua a vedere tutto)</label>
            <div className="field" style={{ marginTop: 8 }}><label>Messaggio per i lettori</label><textarea className="textarea" style={{ minHeight: 60 }} value={m.message} onChange={(e) => setM({ ...m, message: e.target.value })} placeholder="Stiamo aggiornando il sito: torniamo tra pochi minuti." /></div>
            <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveMaintenanceAction(m); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva</button>
          </div>
        </div>
      </div>
    </>
  );
}
