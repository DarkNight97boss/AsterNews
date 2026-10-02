import type { Metadata } from 'next';
import Link from 'next/link';
import { yearGrid } from '@/lib/archive';
import { archiveMonths } from '@/lib/insights';

export const metadata: Metadata = { title: 'Le annate', description: 'Sfoglia il giornale anno per anno, mese per mese.' };
export const dynamic = 'force-dynamic';
const M = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'];
export default async function YearsPage() {
  const grid = yearGrid(await archiveMonths()); const max = Math.max(1, ...grid.flatMap((y) => y.months));
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Le annate</h1><p className="lead">Come in emeroteca: un&apos;annata per riga, i mesi più pieni più scuri.</p>{grid.length === 0 && <p className="help">Nessun articolo pubblicato.</p>}<div className="years">{grid.map((y) => <div key={y.year} className="year-row"><Link href={`/annate/${y.year}`} className="year-label">{y.year}</Link><div className="year-months">{y.months.map((n, i) => <Link key={i} href={n ? `/archivio/${y.year}/${String(i + 1).padStart(2, '0')}` : `/annate/${y.year}`} title={`${n} articoli`} style={{ opacity: n ? 0.25 + 0.75 * (n / max) : 0.08 }}>{M[i]}</Link>)}</div><span className="count">{y.total}</span></div>)}</div></div></div>;
}
