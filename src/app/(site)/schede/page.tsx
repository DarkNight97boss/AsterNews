import type { Metadata } from 'next';
import Link from 'next/link';
import { kindsWithCounts } from '@/lib/civic-data';

export const metadata: Metadata = { title: 'Schede', description: 'Candidati, delibere, cantieri, bandi, negozi, scuole, persone: tutto ciò che il giornale sa, in schede collegate agli articoli.' };
export const dynamic = 'force-dynamic';
export default async function CardsIndex() {
  const kinds = (await kindsWithCounts()).filter((k) => k.n > 0); const groups: Record<string, string> = { politica: 'Politica locale', citta: 'La città', economia: 'Economia', memoria: 'Memoria', emergenza: 'Territorio' };
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Schede</h1><p className="lead">Dietro ogni articolo ci sono persone, delibere, cantieri e luoghi. Qui hanno una pagina stabile, che cresce nel tempo.</p>{kinds.length === 0 && <p className="help">Nessuna scheda pubblicata.</p>}{Object.entries(groups).map(([g, name]) => { const list = kinds.filter((k) => k.def.group === g); return list.length ? <section key={g}><h2>{name}</h2><ul className="hub-grid">{list.map((k) => <li key={k.kind}><Link href={`/schede/${k.kind}`}>{k.def.icon} {k.def.plural}</Link><p>{k.n} {k.n === 1 ? 'scheda' : 'schede'} · {k.def.hint}</p></li>)}</ul></section> : null; })}</div></div>;
}
