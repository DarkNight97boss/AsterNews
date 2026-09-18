import type { Metadata } from 'next';
import { approvedOf } from '@/lib/commons-data';
import { ContributionForm } from '@/components/site/contribution-form';
import { BoardResolve } from '@/components/site/board-resolve';

export const metadata: Metadata = { title: 'Bacheca: smarriti, trovati, passaggi', description: 'Oggetti e animali smarriti o trovati, passaggi offerti e cercati. Ogni avviso scade da solo e si può segnare come risolto.' };
export const dynamic = 'force-dynamic';
export default async function BoardPage({ searchParams }: PageProps<'/bacheca'>) {
  const sp = await searchParams; const now = new Date().toISOString(); const all = await approvedOf('board', { withDone: true, limit: 200 }); const open = all.filter((b) => b.status === 'approved' && (!b.dueAt || b.dueAt > now)); const solved = all.filter((b) => b.status === 'done').slice(0, 12);
  return <div className="account" style={{ maxWidth: 780 }}><div className="account-card trust-page"><h1>Bacheca</h1><p className="lead">Chiavi, gatti, passaggi per l&apos;ospedale. Ogni avviso resta due settimane, poi sparisce da solo; chi l&apos;ha messo può segnarlo come risolto.</p>{sp.risolto && sp.chiave && <BoardResolve id={String(sp.risolto)} token={String(sp.chiave)} />}<ContributionForm kind="board" />
    {open.length === 0 ? <p className="help">Nessun avviso in questo momento.</p> : <ul className="board">{open.map((b) => <li key={b.id}><span className="board-kind">{b.data.what}</span><b>{b.data.title}</b><p>{b.data.text}</p><p className="help">📞 {b.data.contact} · scade il {new Date(b.dueAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p></li>)}</ul>}
    {solved.length > 0 && <><h2>Finite bene</h2><ul className="board solved">{solved.map((b) => <li key={b.id}><span className="board-kind">✓ risolto</span><b>{b.data.title}</b></li>)}</ul></>}</div></div>;
}
