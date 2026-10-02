import type { Metadata } from 'next';
import Link from 'next/link';
import { parseRoles, rolesInYear } from '@/lib/archive';
import { listCards } from '@/lib/civic-data';

export const metadata: Metadata = { title: 'Chi era chi', description: 'Chi ricopriva quale ruolo in città, anno per anno, ricostruito dall\'archivio.' };
export const dynamic = 'force-dynamic';
export default async function WhoWasWho({ searchParams }: PageProps<'/chi-era-chi'>) {
  const sp = await searchParams; const figures = await listCards('figura'); const years = new Set<number>(); for (const f of figures) for (const r of parseRoles(f.fields.ruoli ?? '')) { years.add(r.from); if (r.to) years.add(r.to); }
  const now = new Date().getFullYear(); const min = years.size ? Math.min(...years) : now; const list = Array.from({ length: now - min + 1 }, (_, i) => now - i); const year = Number(sp.anno) || now; const who = rolesInYear(figures, year);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Chi era chi</h1><p className="lead">Chi faceva cosa in città in un anno dato. {figures.length} figure pubbliche in archivio.</p><form method="get" className="form-row"><select className="select" name="anno" aria-label="Anno" defaultValue={String(year)}>{list.map((y) => <option key={y} value={y}>{y}</option>)}</select><button className="btn btn-outline" type="submit">Mostra</button></form><h2>Nel {year}</h2>{who.length === 0 && <p className="help">Nessun ruolo registrato per il {year}. La redazione li aggiunge nelle <Link href="/schede/figura">schede</Link>.</p>}<ul className="trust-list">{who.map((w, i) => <li key={i}><div><b>{w.role}</b>: <Link href={`/schede/figura/${w.figure.slug}`}>{w.figure.title}</Link></div></li>)}</ul></div></div>;
}
