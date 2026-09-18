import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories, getSettings } from '@/lib/queries';

export const revalidate = 600;
type F = { key: string; label: string; type: string };
async function load(slug: string) { const [cats, s] = await Promise.all([getCategories(), getSettings()]); const cat = cats.find((c) => c.slug === slug); const fields = (cat ? (s.customFields?.[cat.id] ?? []) : []) as F[]; return { cats, cat, fields }; }
export async function generateMetadata({ params }: PageProps<'/dati/[slug]'>): Promise<Metadata> { const { cat } = await load((await params).slug); return cat ? { title: `${cat.name}: la tabella`, description: `Tutti i contenuti di ${cat.name} come dati: ordinabili e scaricabili.` } : {}; }
/** I post come dati: ogni contenuto con scheda (libri, ricette, allenamenti) è anche una riga di tabella, ordinabile e scaricabile in CSV. */
export default async function DataPage({ params, searchParams }: PageProps<'/dati/[slug]'>) {
  const { slug } = await params; const sp = await searchParams; const { cats, cat, fields } = await load(slug); if (!cat || !fields.length) notFound();
  const sort = String(sp.ordina ?? ''); const arts = (await listArticles({ status: 'published', categoryId: cat.id }, 'published', 500)).filter((a) => a.extra?.fields && Object.keys(a.extra.fields).length);
  const val = (a: (typeof arts)[number], k: string) => a.extra?.fields?.[k] ?? ''; const f = fields.find((x) => x.key === sort); if (f) arts.sort((a, b) => (['number', 'rating'].includes(f.type) ? Number(val(b, f.key)) - Number(val(a, f.key)) : val(a, f.key).localeCompare(val(b, f.key), 'it')));
  const nums = fields.filter((x) => ['number', 'rating'].includes(x.type)).map((x) => { const v = arts.map((a) => Number(val(a, x.key))).filter((n) => !Number.isNaN(n) && n !== 0); return { label: x.label, avg: v.length ? (v.reduce((n, k) => n + k, 0) / v.length).toFixed(1) : null }; }).filter((x) => x.avg);
  return (
    <div className="container data-page"><div className="page-head"><span className="kicker">Dati</span><h1>{cat.name}: la tabella</h1><p>{arts.length} voci{nums.map((n) => ` · media ${n.label.toLowerCase()}: ${n.avg}`).join('')} · <a href={`/api/export/dati/${cat.slug}`} rel="nofollow">scarica CSV</a></p></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th><Link href={`/dati/${cat.slug}`}>Titolo</Link></th>{fields.map((x) => <th key={x.key} aria-sort={sort === x.key ? 'descending' : undefined}><Link href={`/dati/${cat.slug}?ordina=${x.key}`}>{x.label}{sort === x.key ? ' ↓' : ''}</Link></th>)}<th>Data</th></tr></thead>
        <tbody>{arts.map((a) => <tr key={a.id}><td><Link href={articleUrlWith(a, cats)}>{a.title}</Link></td>{fields.map((x) => <td key={x.key}>{x.type === 'rating' && val(a, x.key) ? '★'.repeat(Number(val(a, x.key))) : x.type === 'url' && val(a, x.key) ? <a href={val(a, x.key)} rel="noopener" target="_blank">link</a> : val(a, x.key)}</td>)}<td>{new Date(a.publishedAt!).toLocaleDateString('it-IT')}</td></tr>)}</tbody></table></div>
    </div>
  );
}
