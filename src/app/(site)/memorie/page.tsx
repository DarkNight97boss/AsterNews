import type { Metadata } from 'next';
import Link from 'next/link';
import { approvedContrib } from '@/lib/civic-data';
import { placeSlug } from '@/lib/reading';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'La memoria dei quartieri', description: 'Interviste brevi a chi ricorda com\'erano le vie e i quartieri, collegate ai luoghi.' };
export const dynamic = 'force-dynamic';
export default async function MemoriesPage() {
  const list = await approvedContrib('memoria-audio'); const decades = [...new Set(list.map((m) => m.data.decade))].sort();
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>La memoria dei quartieri</h1><p className="lead">Chi c&apos;era racconta: tre minuti di voce, un luogo, un decennio. Le registrazioni restano collegate alle vie di cui parlano.</p>{list.length === 0 && <p className="help">Il primo racconto può essere di tuo nonno.</p>}{decades.map((d) => <section key={d}><h2>{d}</h2><ul className="trust-list">{list.filter((m) => m.data.decade === d).map((m) => <li key={m.id}><div><b>{m.data.name}</b> · <Link href={`/luoghi/${placeSlug(m.data.place)}`}>{m.data.place}</Link>{m.data.summary && <p>{m.data.summary}</p>}<audio controls preload="none" src={m.data.audio} style={{ width: '100%', marginTop: 6 }} /></div></li>)}</ul></section>)}<ContributionForm kind="memoria-audio" open /></div></div>;
}
