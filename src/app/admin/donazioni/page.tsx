import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { donationTotals, listDonations } from '@/lib/repo-extra3';
import { DEFAULT_DONATIONS } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { DonationsSettingsForm } from '@/components/admin/donations-settings';

export default async function DonationsAdmin() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [list, tot, s] = await Promise.all([listDonations(200), donationTotals(), getSettings()]);
  const d = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  const eur = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
  return (
    <>
      <div className="page-title"><div><h1>Donazioni</h1><p>{d.enabled ? 'Attive' : 'Non attive'} · pagina pubblica <Link href="/sostieni" target="_blank">/sostieni</Link> e widget nella colonna destra. Pagamenti con Stripe (stessa chiave degli abbonamenti).</p></div></div>
      <DonationsSettingsForm initial={d} stripeReady={!!(s.paywall?.stripeSecretKey || process.env.STRIPE_SECRET_KEY)} />
      <div className="stats">
        <div className="stat" style={{ ['--stat-color' as string]: '#0b7a4b' }}><div className="stat-label">Raccolto totale</div><div className="stat-value">{eur(tot.total)}</div><div className="stat-sub">{tot.count} donazioni</div></div>
        <div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Questo mese</div><div className="stat-value">{eur(tot.month)}</div><div className="stat-sub">pagamenti confermati</div></div>
      </div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Quando</th><th>Nome</th><th>Messaggio</th><th style={{ textAlign: 'right' }}>Importo</th><th>Stato</th></tr></thead><tbody>
        {list.map((x) => <tr key={x.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(x.createdAt)}</td><td><b>{x.name || 'Anonimo'}</b><div className="t-sub">{x.email}</div></td><td className="help">{x.message}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{eur(x.amount)}</td><td>{x.status === 'paid' ? <span className="badge badge-green">pagata</span> : <span className="badge badge-gray">{x.status === 'pending' ? 'in attesa' : 'fallita'}</span>}</td></tr>)}
        {list.length === 0 && <tr><td colSpan={5} className="help">Nessuna donazione ancora.</td></tr>}
      </tbody></table></div>
    </>
  );
}
