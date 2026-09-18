import type { Metadata } from 'next';
import { approvedOf } from '@/lib/commons-data';
import { waitingDays } from '@/lib/community';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Domande al Comune', description: 'Le domande dei cittadini inoltrate al Comune, con i giorni di attesa contati in pubblico.' };
export const dynamic = 'force-dynamic';
export default async function CouncilPage() {
  const all = await approvedOf('council', { withDone: true, limit: 300 }); const now = Date.now(); const waiting = all.filter((q) => !q.data.answer).sort((a, b) => (a.data.sentAt ?? 'z').localeCompare(b.data.sentAt ?? 'z')); const answered = all.filter((q) => q.data.answer); const times = answered.map((q) => waitingDays(q.data.sentAt, q.data.answeredAt, now)).filter((n): n is number => n !== null);
  return <div className="account" style={{ maxWidth: 780 }}><div className="account-card trust-page"><h1>Domande al Comune</h1><p className="lead">Le domande dei cittadini, inoltrate dalla redazione. Il contatore parte il giorno dell&apos;invio e si ferma solo con una risposta.</p>{times.length > 0 && <p className="trust-score"><b>{Math.round(times.reduce((n, t) => n + t, 0) / times.length)} giorni</b> l&apos;attesa media per le {times.length} risposte ricevute.</p>}<ContributionForm kind="council" />
    <h2>In attesa ({waiting.length})</h2>{waiting.length === 0 ? <p className="help">Nessuna domanda in coda.</p> : <ol className="council-queue">{waiting.map((q) => { const d = waitingDays(q.data.sentAt, undefined, now); return <li key={q.id}><span className={`wait${d !== null && d > 30 ? ' late' : ''}`}>{d === null ? 'da inoltrare' : <><b>{d}</b> giorni</>}</span><div><p>{q.data.text}</p><p className="help">{q.data.office ? `A: ${q.data.office} · ` : ''}{q.data.name || 'Un cittadino'}</p></div></li>; })}</ol>}
    <h2>Risposte ricevute</h2>{answered.length === 0 ? <p className="help">Ancora nessuna.</p> : <ol className="council-queue">{answered.map((q) => <li key={q.id}><span className="wait ok"><b>{waitingDays(q.data.sentAt, q.data.answeredAt, now) ?? 0}</b> giorni</span><div><p>{q.data.text}</p><blockquote>{q.data.answer}</blockquote></div></li>)}</ol>}</div></div>;
}
