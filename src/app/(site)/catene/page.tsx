import type { Metadata } from 'next';
import Link from 'next/link';
import { ContributionForm } from '@/components/site/contribution-form';
import { listRecords } from '@/lib/records';

export const metadata: Metadata = { title: 'Verifica delle catene', description: 'I messaggi che girano su WhatsApp e social, verificati uno per uno: vero, falso, in parte.' };
export const dynamic = 'force-dynamic';
const V: Record<string, [string, string]> = { vero: ['✅', 'Vero'], falso: ['❌', 'Falso'], 'in-parte': ['⚠️', 'Vero solo in parte'], 'non-verificabile': ['❔', 'Non verificabile'] };
export default async function ChainsPage({ searchParams }: PageProps<'/catene'>) {
  const sp = await searchParams; const q = typeof sp.q === 'string' ? sp.q.toLowerCase().slice(0, 80) : ''; const [done, pending] = await Promise.all([listRecords<Record<string, string>>('catena', { status: 'done', limit: 200 }), listRecords('catena', { status: 'pending', limit: 50 })]);
  const list = q ? done.filter((r) => `${r.data.text} ${r.data.note}`.toLowerCase().includes(q)) : done;
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/emergenza">Emergenza</Link></p><h1>Verifica delle catene</h1><p className="lead">«Inoltra a tutti»: prima controlla qui. Incolla il messaggio: se è già verificato lo trovi subito, altrimenti ci lavoriamo. {pending.length > 0 && `${pending.length} in verifica.`}</p><ContributionForm kind="catena" open /><form method="get" className="form-row" style={{ marginTop: 14 }}><input className="input" type="search" name="q" placeholder="Cerca tra i messaggi verificati" aria-label="Cerca" defaultValue={q} /><button className="btn btn-outline" type="submit">Cerca</button></form>{list.length === 0 && <p className="help">Nessuna verifica pubblicata{q ? ' per questa ricerca' : ''}.</p>}{list.map((r) => { const [icon, label] = V[r.data.verdict] ?? ['❔', r.data.verdict]; return <article key={r.id} className={`chain chain-${r.data.verdict}`}><p className="chain-verdict">{icon} {label} <span className="help">· {new Date(r.data.verifiedAt).toLocaleDateString('it-IT')}{r.data.where ? ` · girava su ${r.data.where}` : ''}</span></p><blockquote>{r.data.text}</blockquote><p>{r.data.note}</p></article>; })}</div></div>;
}
