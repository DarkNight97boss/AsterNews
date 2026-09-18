import type { Metadata } from 'next';
import Link from 'next/link';
import { getCurrentReader } from '@/lib/auth';
import { listRecords } from '@/lib/records';
import { tally } from '@/lib/community';
import { VoteButtons } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Assemblea dei lettori', description: 'I lettori votano quale inchiesta fare con i soldi degli abbonamenti.' };
export const dynamic = 'force-dynamic';
type Round = { title: string; intro: string; options: { id: string; title: string; desc: string }[]; subscribersOnly?: boolean };
export default async function AssemblyPage() {
  const [rounds, reader] = await Promise.all([listRecords<Round>('assembly', { limit: 24 }), getCurrentReader()]); const now = new Date().toISOString();
  const view = await Promise.all(rounds.map(async (r) => { const votes = await listRecords<{ option: string }>('vote', { ref: r.id, limit: 5000 }); return { r, open: r.status === 'open' && (!r.dueAt || r.dueAt > now), results: tally(r.data.options, votes.map((v) => v.data.option)).map((t) => ({ ...t, desc: r.data.options.find((o) => o.id === t.id)?.desc ?? '' })), mine: votes.find((v) => v.owner === reader?.id)?.data.option ?? '', total: votes.length }; }));
  return <div className="account" style={{ maxWidth: 780 }}><div className="account-card trust-page"><h1>Assemblea dei lettori</h1><p className="lead">Gli abbonamenti pagano il lavoro della redazione: è giusto che chi legge dica su cosa spenderlo. Un voto a testa.</p>{view.length === 0 && <p className="help">Nessuna votazione aperta in questo momento.</p>}
    {view.map(({ r, open, results, mine, total }) => <section key={r.id}><h2>{r.data.title}</h2><p>{r.data.intro}</p><p className="help">{open ? `Aperta fino al ${new Date(r.dueAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}` : 'Votazione chiusa'} · {total} voti{r.data.subscribersOnly ? ' · riservata agli abbonati' : ''}</p><VoteButtons roundId={r.id} options={results} mine={mine} canVote={open && !!reader && (!r.data.subscribersOnly || !!reader.premium)} />{open && !reader && <p className="help"><Link href="/account?redirect=/assemblea">Accedi</Link> per votare.</p>}{!open && results[0]?.votes > 0 && <p><b>Ha vinto: {results[0].title}.</b> La redazione si è impegnata a lavorarci.</p>}</section>)}</div></div>;
}
