import type { Metadata } from 'next';
import Link from 'next/link';
import { LEVEL_LABELS, type AlertLevel } from '@/lib/emergency';
import { listEmergencies } from '@/lib/emergency-data';

export const metadata: Metadata = { title: 'Le emergenze passate', description: 'Dopo ogni emergenza, il resoconto: cosa è successo ora per ora, cosa è stato chiuso, cosa ha funzionato.' };
export const dynamic = 'force-dynamic';
export default async function PastEmergencies() {
  const list = (await listEmergencies()).filter((e) => e.status === 'done');
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/emergenza">Emergenza</Link></p><h1>Le emergenze passate</h1><p className="lead">Il resoconto di ogni allerta, scritto dal diario: serve a imparare, e a ricordare.</p>{list.length === 0 && <p className="help">Nessuna emergenza chiusa.</p>}{list.map((e) => <details key={e.id} className="em-past"><summary><b>{e.title}</b> <span className="help">· {e.level ? LEVEL_LABELS[e.level as AlertLevel] : ''} · {new Date(e.from).toLocaleDateString('it-IT')}{e.to ? ` → ${new Date(e.to).toLocaleDateString('it-IT')}` : ''}</span></summary><pre className="em-report">{e.report}</pre></details>)}</div></div>;
}
