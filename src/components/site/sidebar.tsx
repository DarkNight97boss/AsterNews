import Link from 'next/link';
import { getLiveArticles, getMostRead, getTags } from '@/lib/queries';
import { ArticleCard } from './article-card';
import { NewsletterForm } from './newsletter-form';

export function Sidebar() {
  const live = getLiveArticles();
  return (
    <aside className="sidebar">
      <div className="widget">
        <h3 className="widget-title">I più letti</h3>
        {getMostRead().slice(0, 6).map((a, i) => <ArticleCard key={a.id} article={a} variant="number" index={i + 1} showMeta={false} />)}
      </div>
      <div className="widget-dark">
        <h3>Newsletter ASTER</h3>
        <p>Le notizie più importanti della giornata, ogni mattina alle 7 nella tua casella email.</p>
        <NewsletterForm />
      </div>
      {live.length > 0 && (
        <div className="widget">
          <h3 className="widget-title">In diretta</h3>
          {live.map((a) => <ArticleCard key={a.id} article={a} variant="compact" />)}
        </div>
      )}
      <div className="widget">
        <h3 className="widget-title">Argomenti</h3>
        <div className="tag-cloud">{getTags().slice(0, 18).map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name}</Link>)}</div>
      </div>
      <div className="ad-slot">Spazio pubblicitario 300×250</div>
    </aside>
  );
}
