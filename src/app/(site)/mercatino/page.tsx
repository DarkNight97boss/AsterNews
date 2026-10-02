import type { Metadata } from 'next';
import { approvedContrib } from '@/lib/civic-data';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Mercatino del quartiere', description: 'Compravendita tra vicini, senza spedizioni: ci si incontra in luoghi conosciuti.' };
export const dynamic = 'force-dynamic';
export default async function MarketPage() {
  const now = new Date().toISOString(); const list = (await approvedContrib('mercatino')).filter((m) => m.status === 'approved' && (!m.dueAt || m.dueAt > now));
  return <div className="account" style={{ maxWidth: 860 }}><div className="account-card trust-page"><h1>Mercatino del quartiere</h1><p className="lead">Niente spedizioni e niente corrieri: si vende, si compra o si regala tra vicini, incontrandosi in un posto che tutti conoscono.</p>{list.length === 0 ? <p className="help">Il mercatino è vuoto.</p> : <ul className="board">{list.map((m) => <li key={m.id}>{m.data.image && <img src={m.data.image} alt="" loading="lazy" style={{ width: '100%', borderRadius: 4, marginBottom: 6 }} />}<span className="board-kind">{Number(m.data.price) === 0 ? 'Regalo' : `${Number(m.data.price).toFixed(2).replace('.', ',')} €`}</span><b>{m.data.title}</b><p>{m.data.text}</p><p className="help">📍 {m.data.place} · {m.data.contact}</p></li>)}</ul>}<ContributionForm kind="mercatino" /></div></div>;
}
