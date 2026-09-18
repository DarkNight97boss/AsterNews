import type { Metadata } from 'next';
import { listArticles } from '@/lib/repo';
import { countdown } from '@/lib/personal';

export const metadata: Metadata = { title: 'Lettere al futuro', description: 'Testi già scritti che si apriranno a una data precisa.' };
export const dynamic = 'force-dynamic';
/** Post che si sbloccano nel tempo: articoli programmati e «sigillati». Si vede il titolo e quanto manca, non il testo. */
export default async function SealedPage() {
  const sealed = (await listArticles({ status: 'scheduled', extraHas: 'sealed', includeCircles: true }, 'created', 100)).filter((a) => a.extra?.sealed && !a.extra.circle && a.scheduledAt).sort((a, b) => a.scheduledAt!.localeCompare(b.scheduledAt!)); const now = Date.now();
  return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Lettere al futuro</h1><p className="lead">Queste pagine sono già scritte, ma si aprono solo quando arriva il loro giorno.</p>{sealed.length === 0 && <p className="help">Nessuna lettera in attesa.</p>}<ul className="sealed-list">{sealed.map((a) => { const c = countdown(a.scheduledAt!, now); return <li key={a.id}><span className="seal" aria-hidden="true">✉︎</span><div><b>{a.title}</b><p className="help">si apre il {new Date(a.scheduledAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · {c.days === 0 ? 'oggi' : c.days === 1 ? 'manca un giorno' : `mancano ${c.days} giorni`}</p></div></li>; })}</ul></div></div>;
}
