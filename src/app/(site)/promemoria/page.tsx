import type { Metadata } from 'next';
import { ContributionForm } from '@/components/site/contribution-form';
import { upcoming } from '@/lib/service';
import { listDeadlines } from '@/lib/service-data';

export const metadata: Metadata = { title: 'Promemoria civici', description: 'Le scadenze della città (tasse, iscrizioni, raccolte, bandi) e un\'email tre giorni prima.' };
export const dynamic = 'force-dynamic';
export default async function RemindersPage() {
  const list = upcoming(await listDeadlines(), new Date().toISOString().slice(0, 10), 30);
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Promemoria civici</h1><p className="lead">La TARI, le iscrizioni a scuola, gli ingombranti, i bandi: le scadenze che contano, con un&apos;email tre giorni prima. Senza pubblicità, senza altro.</p><ContributionForm kind="promemoria" open /><h2>Le prossime scadenze</h2>{list.length === 0 && <p className="help">Nessuna scadenza in calendario.</p>}<ul className="trust-list">{list.map((x) => <li key={x.deadline.id + x.on}><time dateTime={x.on}>{new Date(`${x.on}T12:00:00Z`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</time><div><b>{x.deadline.title}</b> <span className="help">· {x.inDays === 0 ? 'oggi' : x.inDays === 1 ? 'domani' : `tra ${x.inDays} giorni`}{x.deadline.yearly ? ' · ogni anno' : ''}</span>{x.deadline.text && <p>{x.deadline.text}</p>}{x.deadline.url && <a href={x.deadline.url} target="_blank" rel="noopener">dove si fa</a>}</div></li>)}</ul></div></div>;
}
