import Link from 'next/link';
import { Article } from '@/lib/models';
import { ArticleCard } from './article-card';

/** Lista paginata lato server (?pagina=N): regge archivi di centinaia di migliaia di articoli. */
export function ArticleList({ articles, total, page, perPage, basePath, query = {} }: { articles: Article[]; total: number; page: number; perPage: number; basePath: string; query?: Record<string, string> }) {
  if (articles.length === 0 && page === 1) return <div className="empty"><h3>Nessun articolo</h3><p>Non ci sono ancora contenuti in questa sezione.</p></div>;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const href = (p: number) => { const q = new URLSearchParams({ ...query, ...(p > 1 ? { pagina: String(p) } : {}) }).toString(); return q ? `${basePath}?${q}` : basePath; };
  return (
    <>
      <div className="list-divided">{articles.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" showExcerpt showMeta />)}</div>
      {pages > 1 && (
        <nav className="pager" aria-label="Pagine">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={href(page - 1)}>← Precedenti</Link>}
          <span className="help">Pagina {page} di {pages} · {total} articoli</span>
          {page < pages && <Link className="btn btn-dark btn-sm" href={href(page + 1)}>Successivi →</Link>}
        </nav>
      )}
    </>
  );
}
