import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CARD_KINDS, delayDays } from '@/lib/civic';
import { listCards } from '@/lib/civic-data';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: PageProps<'/schede/[kind]'>): Promise<Metadata> { const d = CARD_KINDS[(await params).kind]; return d ? { title: d.plural, description: d.hint } : {}; }
export default async function CardsList({ params }: PageProps<'/schede/[kind]'>) {
  const { kind } = await params; const def = CARD_KINDS[kind]; if (!def) notFound(); const cards = await listCards(kind); const now = Date.now();
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/schede">Schede</Link></p><h1>{def.icon} {def.plural}</h1><p className="lead">{def.hint}</p>{cards.length === 0 && <p className="help">Nessuna scheda.</p>}<ul className="trust-list">{cards.map((c) => { const d = kind === 'cantiere' ? delayDays(c.fields.fine_prevista, c.fields.fine_effettiva, now) : null; const sub = [c.fields.lista, c.fields.ruolo, c.fields.via, c.fields.indirizzo, c.fields.categoria, c.fields.ente, c.fields.stato, c.fields.tipo, c.fields.numero ? `n. ${c.fields.numero}` : '', c.fields.data, c.fields.scadenza ? `scade il ${c.fields.scadenza}` : ''].filter(Boolean).join(' · '); return <li key={c.id}><div><Link href={`/schede/${kind}/${c.slug}`}>{c.title}</Link>{sub && <p>{sub}</p>}{d !== null && d > 0 && !c.fields.fine_effettiva && <p className="help" style={{ color: 'var(--red)' }}>{d} giorni di ritardo</p>}</div></li>; })}</ul></div></div>;
}
