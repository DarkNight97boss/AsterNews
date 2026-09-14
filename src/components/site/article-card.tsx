import Link from 'next/link';
import { Article } from '@/lib/models';
import { articleUrl, category } from '@/lib/queries';
import { timeAgo } from '@/lib/utils';
import { SmartImage } from '@/components/ui/smart-image';

export type CardVariant = 'hero' | 'hero-overlay' | 'md' | 'sm' | 'horizontal' | 'compact' | 'number';

interface Props { article: Article; variant?: CardVariant; index?: number; showExcerpt?: boolean; showMeta?: boolean; showKicker?: boolean; priority?: boolean }

export function ArticleCard({ article: a, variant = 'md', index = 0, showExcerpt = false, showMeta = true, showKicker = true, priority = false }: Props) {
  const cat = category(a.categoryId);
  const link = articleUrl(a);
  const cls = ['card', (variant === 'hero' || variant === 'hero-overlay') && 'card-hero', variant === 'hero-overlay' && 'overlay', variant === 'md' && 'card-md', variant === 'sm' && 'card-sm', variant === 'horizontal' && 'card-horizontal', variant === 'compact' && 'card-compact', variant === 'number' && 'card-number'].filter(Boolean).join(' ');
  return (
    <article className={cls}>
      {variant === 'number' ? (
        <span className="num">{index}</span>
      ) : (
        <Link className="card-img" href={link} aria-label={a.title}>
          <SmartImage src={a.coverImage} alt={a.title} priority={priority} sizes={variant === 'compact' ? '96px' : variant === 'horizontal' ? '160px' : '(max-width: 768px) 100vw, 600px'} />
          {variant !== 'compact' && (
            <>
              <span className="card-badges">
                {a.format === 'live' && a.liveActive ? <span className="badge badge-live">Diretta</span> : a.breaking ? <span className="badge badge-red">Ultim&apos;ora</span> : null}
              </span>
              {a.format === 'video' && <span className="card-format">▶</span>}
              {a.format === 'gallery' && <span className="card-format">▦</span>}
            </>
          )}
        </Link>
      )}
      <div className="card-body">
        {showKicker && (
          <Link className="kicker" href={`/${cat?.slug ?? ''}`} style={variant === 'hero-overlay' ? undefined : { color: cat?.color }}>{a.kicker || cat?.name}</Link>
        )}
        <h3 className="card-title"><Link href={link}>{a.title}</Link></h3>
        {showExcerpt && <p className="card-excerpt">{a.excerpt}</p>}
        {showMeta && (
          <div className="meta">
            <span>{timeAgo(a.publishedAt)}</span>
            {a.sponsored && <span>· <span className="sponsored-label">Contenuto sponsorizzato</span></span>}
          </div>
        )}
      </div>
    </article>
  );
}
