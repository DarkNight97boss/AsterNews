import type { Metadata } from 'next';
import { approvedContrib } from '@/lib/civic-data';
import { rentStats } from '@/lib/economy';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Prezzi degli affitti', description: 'La rilevazione mensile dei canoni per zona e metratura, dagli annunci visti dai lettori.' };
export const dynamic = 'force-dynamic';
export default async function RentsPage({ searchParams }: PageProps<'/affitti'>) {
  const sp = await searchParams; const month = /^\d{4}-\d{2}$/.test(String(sp.mese)) ? String(sp.mese) : new Date().toISOString().slice(0, 7); const entries = (await approvedContrib('affitto')).map((e) => ({ zone: e.data.zone, rooms: e.data.rooms, size: Number(e.data.size) || 0, price: Number(e.data.price) || 0, date: e.createdAt })); const months = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse(); const rows = rentStats(entries, month);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Prezzi degli affitti</h1><p className="lead">Canoni rilevati dagli annunci che i lettori vedono in giro, zona per zona. Non è un listino: è quello che si chiede davvero.</p><p className="help">Mese: {months.length ? months.map((m) => <a key={m} className="year-link" href={`/affitti?mese=${m}`} aria-current={m === month ? 'page' : undefined}>{m}</a>) : month}</p>{rows.length === 0 ? <p className="help">Nessuna rilevazione per questo mese.</p> : <table className="data-table"><thead><tr><th>Zona</th><th>Annunci</th><th>Canone mediano</th><th>€/m²</th><th>Mese prima</th></tr></thead><tbody>{rows.map((r) => <tr key={r.zone}><td>{r.zone}</td><td>{r.n}</td><td>{r.median} €</td><td>{r.perSqm ?? '–'}</td><td>{r.prevMedian === null ? '–' : `${r.prevMedian} € (${r.delta! > 0 ? '+' : ''}${r.delta}%)`}</td></tr>)}</tbody></table>}<ContributionForm kind="affitto" /></div></div>;
}
