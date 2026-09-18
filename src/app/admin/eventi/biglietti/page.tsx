import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getEvents } from '@/lib/queries';
import { listTickets } from '@/lib/repo-extra3';
import { TicketCheckin } from '@/components/admin/ticket-checkin';

export const dynamic = 'force-dynamic';
export default async function TicketsPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin');
  const [tickets, events] = await Promise.all([listTickets(500), getEvents({}, 500)]); const paid = tickets.filter((t) => t.status === 'paid');
  const eur = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
  return (
    <>
      <div className="page-title"><div><h1>Biglietti degli eventi</h1><p>{paid.reduce((n, t) => n + t.qty, 0)} biglietti venduti · incasso {eur(paid.reduce((n, t) => n + t.amount, 0))}. Il prezzo si imposta nella scheda dell&apos;evento.</p></div></div>
      <TicketCheckin />
      <div className="table-wrap"><table className="table"><thead><tr><th>Quando</th><th>Evento</th><th>Acquirente</th><th>Biglietti</th><th>Importo</th><th>Codice</th><th>Stato</th></tr></thead><tbody>
        {tickets.map((t) => <tr key={t.id}><td className="help" style={{ whiteSpace: 'nowrap' }}>{new Date(t.createdAt).toLocaleString('it-IT')}</td><td className="t-title">{events.find((e) => e.id === t.eventId)?.title ?? t.eventId}</td><td>{t.name}<div className="t-sub">{t.email}</div></td><td>{t.qty}</td><td>{eur(t.amount)}</td><td><code>{t.code}</code></td><td>{t.usedAt ? <span className="badge badge-gray">entrato</span> : t.status === 'paid' ? <span className="badge badge-green">pagato</span> : <span className="badge badge-amber">in attesa</span>}</td></tr>)}
        {tickets.length === 0 && <tr><td colSpan={7} className="help">Nessun biglietto ancora.</td></tr>}
      </tbody></table></div>
    </>
  );
}
