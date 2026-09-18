import type { Metadata } from 'next';
import Link from 'next/link';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';
import { territory } from '@/lib/reading';

export const metadata: Metadata = { title: 'La mappa del giornale', description: 'Gli articoli come luoghi: ogni sezione è un territorio, ogni punto una storia.' };
export const revalidate = 1800;
export default async function TerritoryPage() {
  const [arts, cats] = await Promise.all([listArticles({ status: 'published' }, 'published', 240), getCategories()]); const t = territory(arts.map((a) => ({ id: a.id, categoryId: a.categoryId, title: a.title, url: articleUrlWith(a, cats), views: a.views })), cats.map((c) => c.id));
  const maxViews = Math.max(1, ...t.points.map((p) => p.views)); const hue = (i: number) => Math.round((i / Math.max(1, t.regions.length)) * 360);
  return (
    <div className="territory"><h1>La mappa del giornale</h1><p className="lead">Ogni sezione è un territorio, ogni punto un articolo: più è grande, più è stato letto. Passa sopra un punto (o usa Tab) per il titolo.</p>
      <svg viewBox="0 0 1000 1000" role="img" aria-label="Mappa degli articoli per sezione">
        {t.regions.map((r, i) => { const c = cats.find((k) => k.id === r.id); return <g key={r.id}><circle cx={r.x} cy={r.y} r={r.r} fill={`hsl(${hue(i)} 60% 94%)`} stroke={`hsl(${hue(i)} 45% 70%)`} /><a href={`/${c?.slug}`}><text x={r.x} y={r.y - r.r - 10} textAnchor="middle" className="terr-label">{c?.name}</text></a></g>; })}
        {t.points.map((p) => { const i = t.regions.findIndex((r) => r.id === p.categoryId); return <a key={p.id} href={p.url} aria-label={p.title}><circle cx={p.x} cy={p.y} r={4 + Math.round((p.views / maxViews) * 7)} fill={`hsl(${hue(i)} 55% 42%)`} className="terr-dot"><title>{p.title}</title></circle></a>; })}
      </svg>
      <details><summary>Elenco testuale ({t.points.length} articoli)</summary>{t.regions.map((r) => <section key={r.id}><h2>{cats.find((k) => k.id === r.id)?.name}</h2><ul>{t.points.filter((p) => p.categoryId === r.id).slice(0, 40).map((p) => <li key={p.id}><Link href={p.url}>{p.title}</Link></li>)}</ul></section>)}</details>
    </div>
  );
}
