import { FollowTag } from '@/components/site/follow-tag';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { articlesByTag, countPublished, getSettings, tagBySlug } from '@/lib/queries';

/** Descrizione automatica dell'argomento quando la redazione non ne ha scritta una: costruita dagli ultimi titoli. */
async function tagDescription(t: { id: string; name: string; description?: string }): Promise<string> {
  if (t.description) return t.description;
  const s = await getSettings(); const recent = await articlesByTag(t.id, 3, 0);
  const themes = recent.map((a) => a.kicker || a.title.split(/[:,]/)[0]).filter(Boolean).slice(0, 3);
  return `Tutte le notizie su ${t.name} su ${s.siteName}: aggiornamenti, approfondimenti e ultime novità${themes.length ? `. Si parla di ${themes.join(', ').toLowerCase()}` : ''}.`;
}
export async function generateMetadata({ params }: PageProps<'/tag/[slug]'>): Promise<Metadata> { const { slug } = await params; const t = await tagBySlug(slug); return t ? { title: `${t.name}: notizie e aggiornamenti`, description: (await tagDescription(t)).slice(0, 160) } : { title: `#${slug}` }; }
export default async function TagPage({ params, searchParams }: PageProps<'/tag/[slug]'>) {
  const reader = await (await import('@/lib/auth')).getCurrentReader();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const t = await tagBySlug(slug);
  if (!t) notFound();
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1); const perPage = (await getSettings()).articlesPerPage;
  const [articles, total] = await Promise.all([articlesByTag(t.id, perPage, (page - 1) * perPage), countPublished({ tagId: t.id })]);
  const desc = await tagDescription(t);
  // «Ciò che sa il giornale su…»: scheda dall'archivio, solo quando c'è abbastanza materiale
  const { entityCard } = await import('@/lib/reading'); const { listArticles } = await import('@/lib/repo'); const { tagsByIds } = await import('@/lib/queries'); const card = total >= 4 ? entityCard(await listArticles({ status: 'published', tagId: t.id }, 'published', 400), t.id) : null; const co = card ? await tagsByIds(card.coTags.map((x) => x.id)) : []; const my = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }) : '');
  return <><div className="page-head"><span className="kicker">Argomento</span><h1>{t.name}</h1><FollowTag tagId={t.id} tagName={t.name} email={reader?.email ?? ''} /><p>{desc} <span className="count">{total} articoli</span></p>{card && <div className="entity-card entity-inline"><dl><div><dt>Ne scriviamo da</dt><dd>{my(card.first)}</dd></div><div><dt>Ultimo articolo</dt><dd>{my(card.last)}</dd></div></dl>{card.perYear.length > 1 && <p className="entity-years" aria-label="Articoli per anno">{card.perYear.map((p) => <span key={p.year} title={`${p.n} articoli nel ${p.year}`}><i style={{ height: 6 + Math.min(40, p.n * 4) }} />{p.year}</span>)}</p>}{co.length > 0 && <p className="entity-tags">Se ne parla insieme a: {co.map((x) => <a key={x.id} href={`/tag/${x.slug}`}>{x.name}</a>)}</p>}</div>}</div><div className="layout-sidebar"><div><ArticleList articles={articles} total={total} page={page} perPage={perPage} basePath={`/tag/${t.slug}`} /></div><Sidebar /></div></>;
}
