import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listArticles } from '@/lib/repo';
import { getCategories, getZones, tagsByIds } from '@/lib/queries';
import { ArticleCard } from '@/components/site/article-card';
import { entityCard, placeSlug } from '@/lib/reading';
import { approvedOf } from '@/lib/commons-data';
import { decadeOf } from '@/lib/community';

export const revalidate = 900;
async function load(slug: string) { const words = slug.split('-').filter(Boolean); if (!words.length) return []; const all = await listArticles({ status: 'published', q: words[words.length - 1] }, 'published', 300); return all.filter((a) => a.address && placeSlug(a.address) === slug); }
export async function generateMetadata({ params }: PageProps<'/luoghi/[slug]'>): Promise<Metadata> { const { slug } = await params; const arts = await load(slug); const name = arts[0]?.address?.replace(/[,\s]*\d.*$/, '') ?? slug; return { title: `Ciò che sappiamo su ${name}`, description: `Tutti gli articoli che riguardano ${name}, dal più recente.`, robots: arts.length < 2 ? { index: false } : undefined }; }
/** «Ciò che sa il giornale su via Roma»: scheda generata dall'archivio a partire dall'indirizzo degli articoli. */
export default async function PlacePage({ params }: PageProps<'/luoghi/[slug]'>) {
  const { slug } = await params; const arts = await load(slug); const photos = (await approvedOf('photo', { limit: 400 })).filter((p) => p.data.placeSlug === slug && p.data.year).sort((a, b) => Number(a.data.year) - Number(b.data.year)); if (!arts.length && !photos.length) notFound(); const name = (arts[0]?.address ?? photos[0].data.place).replace(/[,\s]*\d.*$/, ''); const card = entityCard(arts);
  const [tags, zones] = await Promise.all([tagsByIds(card.coTags.map((t) => t.id)), getZones()]); void getCategories; const y = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : '');
  return (
    <div className="container entity-page"><header className="entity-card"><p className="kicker">Dall&apos;archivio</p><h1>Ciò che sappiamo su {name}</h1>
      <dl><div><dt>Articoli</dt><dd>{card.count}</dd></div><div><dt>Prima volta</dt><dd>{y(card.first)}</dd></div><div><dt>Ultima</dt><dd>{y(card.last)}</dd></div>{card.zones[0] && zones.find((z) => z.id === card.zones[0].id) && <div><dt>Zona</dt><dd><Link href={`/zone/${zones.find((z) => z.id === card.zones[0].id)!.slug}`}>{zones.find((z) => z.id === card.zones[0].id)!.name}</Link></dd></div>}</dl>
      {card.perYear.length > 1 && <p className="entity-years" aria-label="Articoli per anno">{card.perYear.map((p) => <span key={p.year} title={`${p.n} articoli nel ${p.year}`}><i style={{ height: 6 + p.n * 8 }} />{p.year}</span>)}</p>}
      {tags.length > 0 && <p className="entity-tags">Se ne parla insieme a: {tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name}</Link>)}</p>}</header>
      {photos.length > 0 && <section className="section time-map"><div className="section-title"><h2>Lo stesso posto, nel tempo</h2></div><div className="time-strip">{photos.map((p) => <figure key={p.id}><img src={p.data.image} alt={p.data.caption} loading="lazy" /><figcaption><b>{p.data.year}</b> · {decadeOf(Number(p.data.year))}<span>{p.data.caption}</span><span>{arts.filter((a) => (a.publishedAt ?? '').slice(0, 3) === p.data.year.slice(0, 3)).length || 'nessun'} articoli di quel decennio</span></figcaption></figure>)}<figure className="today"><div>Oggi</div><figcaption><b>{new Date().getFullYear()}</b><span>{arts.length} articoli in archivio</span></figcaption></figure></div><p className="help">Hai una foto di questo posto? <Link href="/archivio-fotografico">Aggiungila all&apos;archivio</Link>.</p></section>}
      <div className="grid grid-3">{arts.slice(0, 30).map((a) => <ArticleCard key={a.id} article={a} showMeta />)}</div>
    </div>
  );
}
