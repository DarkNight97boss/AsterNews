import type { Metadata } from 'next';
import { listRecords } from '@/lib/records';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Diritto all\'oblio', description: 'Come chiedere la deindicizzazione o la rimozione di un contenuto, e il registro delle decisioni in forma anonima.' };
export const dynamic = 'force-dynamic';
export default async function OblivionPage() {
  const done = (await listRecords<Record<string, string>>('oblio', { status: 'done', limit: 200 })).filter((r) => r.data.decidedAt); const pending = await listRecords('oblio', { status: 'pending', limit: 200 });
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Diritto all&apos;oblio</h1><p className="lead">Un fatto vero resta vero, ma non sempre deve restare in cima a Google con il tuo nome. Qui si chiede, la redazione decide entro trenta giorni con una motivazione scritta, e la decisione entra nel registro: senza nomi, con il motivo.</p><ContributionForm kind="oblio" /><h2>Il registro delle decisioni</h2><p className="help">{pending.length} {pending.length === 1 ? 'richiesta in esame' : 'richieste in esame'} · {done.length} decise.</p>{done.length === 0 ? <p className="help">Nessuna decisione ancora.</p> : <ul className="trust-list">{done.map((r) => <li key={r.id}><time dateTime={r.data.decidedAt}>{new Date(r.data.decidedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</time><div><b className={`dec-${r.data.decision}`}>{r.data.decision}</b> · motivo: {r.data.reason}{r.data.noindex && ' · pagina esclusa dai motori'}<p>{r.data.motivation}</p></div></li>)}</ul>}</div></div>;
}
