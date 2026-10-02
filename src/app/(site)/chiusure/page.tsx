import type { Metadata } from 'next';
import Link from 'next/link';
import { ContributionForm } from '@/components/site/contribution-form';
import { closureGroups } from '@/lib/emergency';
import { listClosures } from '@/lib/emergency-data';

export const metadata: Metadata = { title: 'Chiusure', description: 'Strade, scuole, uffici, ponti, trasporti: cosa è chiuso adesso e fino a quando, con l\'ora dell\'ultimo aggiornamento.' };
export const dynamic = 'force-dynamic';
export default async function ClosuresPage() {
  const list = await listClosures(); const groups = closureGroups(list); const last = list.map((c) => c.updatedAt).sort().pop();
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/emergenza">Emergenza</Link></p><h1>Chiusure</h1><p className="lead">Cosa è chiuso, cosa è riaperto, fino a quando. {last && <>Ultimo aggiornamento {new Date(last).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.</>}</p>{groups.length === 0 && <p className="help">Nessuna chiusura registrata.</p>}{groups.map((g) => <section key={g.kind}><h2>{g.label}</h2><ul className="trust-list">{g.items.map((c) => <li key={c.id}><span className={`cl-dot cl-${c.status}`} aria-hidden="true" /><div><b>{c.name}</b> <span className="help">· {c.status}{c.until ? ` fino al ${c.until}` : ''}{c.note ? ` · ${c.note}` : ''}</span></div></li>)}</ul></section>)}<ContributionForm kind="chiusura-segnalata" /></div></div>;
}
