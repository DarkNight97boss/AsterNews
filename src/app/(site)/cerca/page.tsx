import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleList } from '@/components/site/article-list';
import { SearchBox } from '@/components/site/search-box';
import { Sidebar } from '@/components/site/widgets';
import { getCategories, getSettings, search } from '@/lib/queries';

export async function generateMetadata({ searchParams }: PageProps<'/cerca'>): Promise<Metadata> { const { q } = await searchParams; return { title: q ? `Ricerca: ${q}` : 'Cerca', robots: { index: false } }; }
export default async function SearchPage({ searchParams }: PageProps<'/cerca'>) {
  const sp = await searchParams;
  const q = typeof sp.q === 'string' ? sp.q : '';
  const categoryId = typeof sp.categoria === 'string' ? sp.categoria : ''; const from = typeof sp.dal === 'string' ? sp.dal : ''; const to = typeof sp.al === 'string' ? sp.al : '';
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1);
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const perPage = settings.articlesPerPage;
  const results = q ? await search(q, perPage, (page - 1) * perPage, { categoryId: categoryId || undefined, from: from || undefined, to: to ? new Date(new Date(to).getTime() + 86400000).toISOString() : undefined }) : { items: [], total: 0, suggestions: [] };
  const query: Record<string, string> = { q, ...(categoryId ? { categoria: categoryId } : {}), ...(from ? { dal: from } : {}), ...(to ? { al: to } : {}) };
  return (
    <>
      <div className="page-head"><h1>Cerca</h1><SearchBox q={q} categories={categories.map((c) => ({ id: c.id, name: c.name }))} categoryId={categoryId} from={from} to={to} />{q && <p><span className="count">{results.total} risultati per «{q}»</span></p>}</div>
      <div className="layout-sidebar"><div>
        {q && results.total === 0 && results.suggestions.length > 0 && <p className="search-didyoumean">Forse cercavi: {results.suggestions.map((sug) => <Link key={sug} href={`/cerca?q=${encodeURIComponent(sug)}`}>{sug}</Link>)}</p>}
        {q ? <ArticleList articles={results.items} total={results.total} page={page} perPage={perPage} basePath="/cerca" query={query} /> : <p style={{ color: 'var(--gray-500)' }}>Inserisci un termine per iniziare la ricerca. Puoi filtrare per categoria e periodo.</p>}
      </div><Sidebar /></div>
    </>
  );
}
