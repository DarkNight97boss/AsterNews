import type { Metadata } from 'next';
import Link from 'next/link';
import { alphaIndex } from '@/lib/archive';
import { listCards } from '@/lib/civic-data';

export const metadata: Metadata = { title: 'Toponimi: le vie e i loro nomi', description: 'Il dizionario delle vie: a chi o a cosa sono intitolate, da quando, e come si chiamavano prima.' };
export const dynamic = 'force-dynamic';
export default async function ToponymsPage() {
  const idx = alphaIndex(await listCards('toponimo')); const n = idx.reduce((s, l) => s + l.items.length, 0);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Toponimi</h1><p className="lead">Perché la via si chiama così. {n} voci, in ordine alfabetico senza «via» e «piazza».</p>{n === 0 && <p className="help">Nessuna voce ancora: la redazione le aggiunge dalle <Link href="/schede/toponimo">schede</Link>.</p>}<p className="alpha-nav">{idx.map((l) => <a key={l.letter} href={`#l-${l.letter === '#' ? 'altro' : l.letter}`}>{l.letter}</a>)}</p>{idx.map((l) => <section key={l.letter} id={`l-${l.letter === '#' ? 'altro' : l.letter}`}><h2>{l.letter}</h2><ul className="trust-list">{l.items.map((c) => <li key={c.id}><div><Link href={`/schede/toponimo/${c.slug}`}>{c.title}</Link><div className="help">{[c.fields.anno ? `intitolata nel ${c.fields.anno}` : '', c.fields.prima ? `prima: ${c.fields.prima}` : '', (c.fields.origine ?? '').slice(0, 140)].filter(Boolean).join(' · ')}</div></div></li>)}</ul></section>)}</div></div>;
}
