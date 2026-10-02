import type { Metadata } from 'next';
import { ContributionForm } from '@/components/site/contribution-form';
import { listRecords } from '@/lib/records';

export const metadata: Metadata = { title: 'Domande alla redazione', description: 'Chiedi: che fine ha fatto, dove si fa, chi decide. Le risposte utili a tutti restano qui.' };
export const dynamic = 'force-dynamic';
export default async function QuestionsPage() {
  const list = await listRecords<Record<string, string>>('domanda', { status: 'done', limit: 100 });
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Domande alla redazione</h1><p className="lead">«Che fine ha fatto il cantiere di via X?», «dove si rinnova la tessera?», «chi decide sugli orari della ZTL?». Chiedi; rispondiamo via email e, se serve a tutti, anche qui.</p><ContributionForm kind="domanda" open /><h2>Risposte pubbliche</h2>{list.length === 0 && <p className="help">Ancora nessuna risposta pubblica.</p>}{list.map((q) => <article key={q.id} className="qa"><h3>{q.data.text}</h3><p className="help">chiede {q.data.name} · risponde {q.data.answeredBy}, {new Date(q.data.answeredAt).toLocaleDateString('it-IT')}</p><p style={{ whiteSpace: 'pre-line' }}>{q.data.answer}</p></article>)}</div></div>;
}
