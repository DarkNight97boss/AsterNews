import type { Metadata } from 'next';
import Link from 'next/link';
import { approvedOf } from '@/lib/commons-data';
import { listRecords } from '@/lib/records';
import { collectiveYear, decadeOf } from '@/lib/community';
import { ContributionForm, GuessYear } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Archivio fotografico della città', description: 'Le fotografie dei cassetti dei lettori, datate insieme.' };
export const dynamic = 'force-dynamic';
export default async function PhotoArchivePage() {
  const photos = await approvedOf('photo', { limit: 300 }); const dated = await Promise.all(photos.map(async (p) => { const guesses = (await listRecords<{ year: string }>('photo-year', { ref: p.id, limit: 500 })).map((g) => Number(g.data.year)); const c = collectiveYear([...(p.data.year ? [Number(p.data.year)] : []), ...guesses]); return { p, c }; }));
  const decades = [...new Set(dated.map((d) => (d.c ? decadeOf(d.c.year) : 'Da datare')))].sort();
  return <div className="container photo-archive"><div className="page-head"><span className="kicker">Comunità</span><h1>Archivio fotografico della città</h1><p>Le foto che stavano nei cassetti. Non sempre si sa di che anno sono: la data la decidiamo insieme, e più persone rispondono più diventa precisa.</p></div><ContributionForm kind="photo" />
    {dated.length === 0 && <p className="help">L&apos;archivio aspetta la prima fotografia.</p>}{decades.map((dec) => <section key={dec} className="section"><div className="section-title"><h2>{dec}</h2></div><div className="photo-grid">{dated.filter((d) => (d.c ? decadeOf(d.c.year) : 'Da datare') === dec).map(({ p, c }) => <figure key={p.id}><img src={p.data.image} alt={p.data.caption} loading="lazy" /><figcaption><b>{p.data.caption}</b><span>{p.data.placeSlug ? <Link href={`/luoghi/${p.data.placeSlug}`}>{p.data.place}</Link> : p.data.place}{c ? ` · circa ${c.year}${c.votes > 1 ? ` (${c.votes} pareri, ±${Math.ceil(c.spread / 2)} anni)` : ''}` : ''}</span>{p.data.name && <span>dal cassetto di {p.data.name}</span>}<GuessYear id={p.id} /></figcaption></figure>)}</div></section>)}</div>;
}
