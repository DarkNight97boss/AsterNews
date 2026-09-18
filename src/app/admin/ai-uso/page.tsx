import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings, getUsers } from '@/lib/queries';
import { aiUsageSummary } from '@/lib/ai-usage';
import { AiBudgetForm } from '@/components/admin/ai-budget-form';

export const dynamic = 'force-dynamic';
export default async function AiUsagePage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [s, u, users] = await Promise.all([getSettings(), aiUsageSummary(), getUsers()]);
  const money = (n: number) => n.toFixed(2).replace('.', ',') + ' €'; const budget = s.ai?.monthlyBudget ?? 0;
  return (
    <>
      <div className="page-title"><div><h1>Uso dell&apos;assistente AI</h1><p>Ogni richiesta a Claude viene registrata con azione, utente, token e costo stimato. Con un tetto mensile l&apos;assistente si ferma da solo quando lo raggiunge.</p></div></div>
      <div className="stats"><div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Richieste questo mese</div><div className="stat-value">{u.month.calls}</div></div><div className="stat" style={{ ['--stat-color' as string]: '#8a8a8a' }}><div className="stat-label">Token (ingresso / uscita)</div><div className="stat-value" style={{ fontSize: 22 }}>{u.month.input.toLocaleString('it-IT')} / {u.month.output.toLocaleString('it-IT')}</div></div><div className="stat" style={{ ['--stat-color' as string]: budget && u.month.cost >= budget ? '#d7262d' : '#0b7a4b' }}><div className="stat-label">Costo stimato</div><div className="stat-value">{money(u.month.cost)}</div><div className="stat-sub">{budget ? `tetto ${money(budget)}` : 'nessun tetto'}</div></div></div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Per azione (questo mese)</div><table className="table"><tbody>{u.byAction.map((a) => <tr key={a.action}><td className="t-title">{a.action}</td><td>{a.calls} richieste</td><td style={{ textAlign: 'right' }}>{money(a.cost)}</td></tr>)}{u.byAction.length === 0 && <tr><td className="help">Nessuna richiesta.</td></tr>}</tbody></table>
          <div className="panel-title" style={{ marginTop: 16 }}>Per utente</div><table className="table"><tbody>{u.byUser.map((x) => <tr key={x.userId}><td className="t-title">{users.find((k) => k.id === x.userId)?.name ?? (x.userId || 'automatico')}</td><td>{x.calls} richieste</td><td style={{ textAlign: 'right' }}>{money(x.cost)}</td></tr>)}</tbody></table></div>
        <AiBudgetForm budget={budget} priceIn={s.ai?.priceIn ?? 0} priceOut={s.ai?.priceOut ?? 0} />
      </div>
      <div className="panel"><div className="panel-title">Ultime richieste</div><table className="table"><thead><tr><th>Quando</th><th>Azione</th><th>Utente</th><th>Modello</th><th>Token</th><th>Costo</th></tr></thead><tbody>{u.recent.map((r) => <tr key={r.id}><td className="help" style={{ whiteSpace: 'nowrap' }}>{new Date(r.createdAt).toLocaleString('it-IT')}</td><td>{r.action}</td><td>{users.find((k) => k.id === r.userId)?.name ?? '—'}</td><td className="help">{r.model}</td><td>{r.input} / {r.output}</td><td>{money(r.cost)}</td></tr>)}</tbody></table></div>
    </>
  );
}
