import type { Metadata } from 'next';
import Link from 'next/link';
import { allPaths } from '@/lib/paths-data';

export const metadata: Metadata = { title: 'Percorsi di lettura', description: 'Serie guidate per capire un tema in poche tappe, con il punto a cui sei arrivato.' };
export const dynamic = 'force-dynamic';
export default async function PathsPage() {
  const paths = await allPaths();
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Percorsi di lettura</h1><p className="lead">Per capire un tema non serve leggere tutto: servono gli articoli giusti, nell&apos;ordine giusto.</p>{paths.length === 0 && <p className="help">Nessun percorso pubblicato per ora.</p>}<ul className="trust-list">{paths.map((p) => <li key={p.id}><div><Link href={`/percorsi/${p.data.slug}`}>{p.data.title}</Link><p>{p.data.intro}</p><p className="help">{p.data.steps.length} tappe</p></div></li>)}</ul></div></div>;
}
