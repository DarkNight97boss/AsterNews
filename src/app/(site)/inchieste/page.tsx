import type { Metadata } from 'next';
import Link from 'next/link';
import { listFunds } from '@/lib/economy-data';
import { fundProgress } from '@/lib/economy';

export const metadata: Metadata = { title: 'Inchieste finanziate dai lettori', description: 'Ogni inchiesta ha un obiettivo, gli aggiornamenti e il resoconto delle spese.' };
export const dynamic = 'force-dynamic';
export default async function FundsPage() { const funds = await listFunds(); return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Inchieste finanziate dai lettori</h1><p className="lead">Un&apos;inchiesta costa settimane di lavoro. Qui si raccolgono i fondi per una sola, con l&apos;obiettivo in chiaro, gli aggiornamenti e, alla fine, dove sono andati i soldi.</p>{funds.length === 0 && <p className="help">Nessuna inchiesta aperta.</p>}<ul className="trust-list">{funds.map((f) => { const p = fundProgress(f.goal, f.raised); return <li key={f.id}><div><Link href={`/inchieste/${f.slug}`}>{f.title}</Link><p>{f.intro.slice(0, 160)}</p><div className="funding-bar"><span style={{ width: `${p.percent}%` }} /></div><p className="help">{f.raised.toLocaleString('it-IT')} € su {f.goal.toLocaleString('it-IT')} € · {p.percent}% · {f.donors} donatori · {f.status === 'open' ? 'aperta' : f.status === 'done' ? 'finanziata' : 'chiusa'}</p></div></li>; })}</ul></div></div>; }
