import { Article } from '@/lib/models';
import { getSettings } from '@/lib/queries';
import { ArticleCard } from './article-card';
import { LoadMore } from './load-more';

export function ArticleList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return <div className="empty"><h3>Nessun articolo</h3><p>Non ci sono ancora contenuti in questa sezione.</p></div>;
  }
  return (
    <LoadMore step={getSettings().articlesPerPage}>
      {articles.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" showExcerpt />)}
    </LoadMore>
  );
}
