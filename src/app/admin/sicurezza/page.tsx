import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listSecurity, securityStats } from '@/lib/security-log';
import { formatDate } from '@/lib/utils';

const KIND: Record<string, string> = { login_ok: 'Accesso', login_failed: 'Accesso fallito', sso_ok: 'Accesso SSO', password_reset: 'Reset password', totp_failed: 'Codice 2FA errato' };
export default async function SecurityPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [rows, st] = await Promise.all([listSecurity(200), securityStats()]);
  return (
    <>
      <div className="page-title"><div><h1>Log di sicurezza</h1><p>Accessi alla redazione negli ultimi 90 giorni con IP, dispositivo e paese. Avvisi automatici per tentativi ripetuti e paesi nuovi.</p></div></div>
      <div className="stats"><div className="stat" style={{ ['--stat-color' as string]: '#0b7a4b' }}><div className="stat-label">Accessi (30 gg)</div><div className="stat-value">{st.ok}</div></div><div className="stat" style={{ ['--stat-color' as string]: '#d7262d' }}><div className="stat-label">Falliti (30 gg)</div><div className="stat-value">{st.failed}</div></div><div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Paesi</div><div className="stat-value">{st.countries.length}</div><div className="stat-sub">{st.countries.slice(0, 3).map((c) => `${c.country} (${c.n})`).join(', ')}</div></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Quando</th><th>Evento</th><th>Email</th><th>IP · Paese</th><th>Dispositivo</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td><td><span className={`badge ${r.kind === 'login_failed' || r.kind === 'totp_failed' ? 'badge-red' : 'badge-green'}`}>{KIND[r.kind] ?? r.kind}</span></td><td>{r.email}</td><td><code>{r.ip}</code>{r.country && ` · ${r.country}`}</td><td className="help" style={{ maxWidth: 320 }}>{r.ua.slice(0, 90)}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={5} className="help">Nessun evento registrato ancora.</td></tr>}
      </tbody></table></div>
    </>
  );
}
