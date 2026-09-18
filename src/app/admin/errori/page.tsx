import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listErrors } from '@/lib/repo-extra';
import { getSettings } from '@/lib/queries';
import { DEFAULT_MONITORING } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { clearErrorsAction, runHealthCheckAction } from '@/lib/actions-backup';
import { syntheticHistory } from '@/lib/synthetic';

export default async function ErrorsPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  const [errors, s, synth] = await Promise.all([listErrors(100), getSettings(), syntheticHistory()]);
  const mon = { ...DEFAULT_MONITORING, ...(s.monitoring ?? {}) };
  return (
    <>
      <div className="page-title"><div><h1>Errori e salute</h1><p>Errori del server registrati automaticamente. Avvisi: {mon.alertEmail ? `email a ${mon.alertEmail}` : 'nessuna email'}{mon.webhookUrl ? ' · webhook attivo' : ''} · soglia database lento {mon.slowQueryMs} ms{process.env.SENTRY_DSN ? ' · inoltro a Sentry attivo' : ''}.</p></div>
        <div className="actions"><Link className="btn btn-outline" href="/api/db-status" target="_blank">Diagnostica database ↗</Link><ActionButton className="btn btn-outline" action={() => runHealthCheckAction()}>Esegui controllo salute</ActionButton><ActionButton className="btn btn-danger" confirm="Svuotare il registro errori?" action={() => clearErrorsAction()}>Svuota</ActionButton></div></div>
      <div className="table-wrap"><table className="table audit-table">
        <thead><tr><th>Ultimo</th><th>Errore</th><th>Percorso</th><th style={{ textAlign: 'right' }}>Volte</th></tr></thead>
        <tbody>
          {errors.map((e) => <tr key={e.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.lastSeen)}<div className="help">dal {formatDate(e.firstSeen)}</div></td><td><b>{e.message}</b>{e.stack && <details><summary className="help" style={{ cursor: 'pointer' }}>stack</summary><pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{e.stack}</pre></details>}{e.digest && <div className="help">digest {e.digest}</div>}</td><td><code>{e.path}</code></td><td style={{ textAlign: 'right', fontWeight: 700 }}>{e.count}</td></tr>)}
          {errors.length === 0 && <tr><td colSpan={4} className="help">Nessun errore registrato. 🎉</td></tr>}
        </tbody></table></div>
      <div className="panel"><div className="panel-title">Monitoraggio sintetico (ogni 15 minuti, ultime 24 ore)</div>{synth.length === 0 ? <p className="help">Nessun controllo ancora: parte dal cron ogni 15 minuti.</p> : <table className="table"><thead><tr><th>Pagina</th><th>Ultimo stato</th><th>Tempo</th><th>Disponibilità 24h</th></tr></thead><tbody>{synth[0].map((r) => { const hist = synth.map((run) => run.find((x) => x.url === r.url)).filter(Boolean); const up = hist.filter((h) => h!.ok).length; return <tr key={r.url}><td className="t-title">{r.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</td><td><span className={`badge ${r.ok ? 'badge-green' : 'badge-red'}`}>{r.status || 'errore'}</span></td><td>{r.ms} ms</td><td>{((up / hist.length) * 100).toFixed(1)}%</td></tr>; })}</tbody></table>}</div>
    </>
  );
}
