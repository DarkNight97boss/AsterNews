import { redirect } from 'next/navigation';
import { ReleasePanel } from '@/components/admin/release-panel';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { migrationsLog, productionDeployments, releaseState } from '@/lib/release';
import { listPageSpeedRuns } from '@/lib/repo-extra3';

export const dynamic = 'force-dynamic';
export default async function ReleasePage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [state, s, runs, migrations] = await Promise.all([releaseState(), getSettings(), listPageSpeedRuns(20), migrationsLog(400)]);
  const token = s.updates?.vercelToken || process.env.VERCEL_TOKEN || ''; const project = s.updates?.vercelProjectId || process.env.VERCEL_PROJECT_ID || '';
  let deployments: Awaited<ReturnType<typeof productionDeployments>> = []; let deployError = '';
  if (token && project) { try { deployments = await productionDeployments(token, project); } catch (e) { deployError = (e as Error).message; } } else deployError = 'Per il ripristino servono token e ID progetto Vercel (Impostazioni → Sistema → Staging e promozione).';
  const seen = new Set<string>(); const perf = runs.filter((r) => r.strategy === 'mobile' && !seen.has(r.url) && seen.add(r.url)).slice(0, 3).map((r) => ({ url: r.url.replace(/^https?:\/\/[^/]+/, '') || '/', performance: r.performance, at: r.createdAt }));
  const failed = migrations.filter((m) => !m.ok);
  return (
    <>
      <ReleasePanel state={state} deployments={deployments} deployError={deployError} perf={perf} maintenance={{ enabled: !!s.maintenance?.enabled, message: s.maintenance?.message ?? '' }} hasHook={!!s.updates?.deployHookUrl} />
      <div className="panel"><div className="panel-title">Registro delle migrazioni del database ({migrations.length} applicate{failed.length ? `, ${failed.length} con errore` : ''})</div>
        <p className="help" style={{ marginBottom: 8 }}>Ogni modifica allo schema viene eseguita una sola volta e registrata qui con data ed esito.</p>
        <div className="table-wrap" style={{ border: 0, maxHeight: 320, overflow: 'auto' }}><table className="table"><thead><tr><th>Quando</th><th>Istruzione</th><th>Esito</th></tr></thead><tbody>{[...failed, ...migrations.filter((m) => m.ok)].slice(0, 120).map((m) => <tr key={m.id}><td className="help" style={{ whiteSpace: 'nowrap' }}>{new Date(m.appliedAt).toLocaleString('it-IT')}</td><td><code style={{ fontSize: 11 }}>{m.stmt.slice(0, 110)}</code></td><td>{m.ok ? <span className="badge badge-green">ok</span> : <span className="badge badge-red" title={m.error}>errore</span>}</td></tr>)}</tbody></table></div>
      </div>
    </>
  );
}
