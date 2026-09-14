import Link from 'next/link';
import { Article, ROLE_LABELS } from '@/lib/models';
import { articleUrl, category, user } from '@/lib/queries';
import { relativeDate } from '@/lib/utils';
import { SmartImage } from '@/components/ui/smart-image';

export type CardVariant = 'hero' | 'md' | 'sm' | 'horizontal' | 'horizontal-sm' | 'compact' | 'number' | 'city' | 'opinion' | 'overlay' | 'overlay-sm';
interface Props { article: Article; variant?: CardVariant; index?: number; showExcerpt?: boolean; showMeta?: boolean; showImage?: boolean; priority?: boolean }

export function Kicker({ article: a, className = 'kicker' }: { article: Article; className?: string }) {
  const cat = category(a.categoryId);
  return (
    <span className={className} style={{ color: cat?.kind === 'dossier' ? 'var(--ink)' : undefined }}>
      {cat?.kind === 'dossier' && <span className="badge badge-yellow">Dossier</span>}
      {a.format === 'live' && a.liveActive && <span className="badge badge-live">Diretta</span>}
      {a.breaking && !(a.format === 'live' && a.liveActive) && <span className="badge badge-red">Ultim&apos;ora</span>}
      <Link href={`/${cat?.slug ?? ''}`}>{a.kicker || cat?.name}</Link>
    </span>
  );
}

export function ArticleCard({ article: a, variant = 'md', index = 0, showExcerpt = false, showMeta = false, showImage = true, priority = false }: Props) {
  const cat = category(a.categoryId);
  const link = articleUrl(a);
  const author = user(a.authorId);
  const cls = `card card-${variant}`;

  if (variant === 'city') {
    return (
      <article className={cls}>
        <h3 className="card-title"><Link href={link}><span className="city">{a.kicker || cat?.name}</span>{a.title}</Link></h3>
      </article>
    );
  }
  if (variant === 'number') {
    return (
      <article className={cls}>
        <span className="num">{index}</span>
        <div className="card-body"><Kicker article={a} /><h3 className="card-title"><Link href={link}>{a.title}</Link></h3></div>
      </article>
    );
  }
  if (variant === 'opinion') {
    return (
      <article className={cls}>
        {author && <div className="op-head"><img src={author.avatar} alt={author.name} /><div><Link className="op-name" href={`/autore/${author.id}`}>{author.name}</Link><div className="op-role">{ROLE_LABELS[author.role]}</div></div></div>}
        <h3 className="card-title"><Link href={link}>{a.title}</Link></h3>
        {showExcerpt && <p className="card-excerpt">{a.excerpt}</p>}
      </article>
    );
  }
  if (variant === 'overlay' || variant === 'overlay-sm') {
    return (
      <article className={`card card-overlay ${variant === 'overlay-sm' ? 'card-overlay-sm' : ''}`}>
        <Link className="card-img" href={link} aria-label={a.title}><SmartImage src={a.coverImage} alt={a.title} priority={priority} sizes={variant === 'overlay' ? '(max-width: 768px) 100vw, 800px' : '(max-width: 768px) 100vw, 400px'} />{a.format === 'video' && <span className="card-format">▶</span>}</Link>
        <div className="card-body">
          <Kicker article={a} />
          <h3 className="card-title"><Link href={link}>{a.title}</Link></h3>
          {showExcerpt && variant === 'overlay' && <p className="card-excerpt">{a.excerpt}</p>}
          {showMeta && <div className="meta"><span>{relativeDate(a.publishedAt)}</span></div>}
        </div>
      </article>
    );
  }
  return (
    <article className={cls}>
      {showImage && variant !== 'compact' && (
        <Link className="card-img" href={link} aria-label={a.title}>
          <SmartImage src={a.coverImage} alt={a.title} priority={priority} sizes={variant === 'horizontal-sm' ? '130px' : '(max-width: 768px) 100vw, 600px'} />
          {a.format === 'video' && <span className="card-format">▶</span>}
          {a.format === 'gallery' && <span className="card-format">▦</span>}
        </Link>
      )}
      <div className="card-body">
        <Kicker article={a} />
        <h3 className="card-title"><Link href={link}>{a.title}</Link></h3>
        {showExcerpt && <p className="card-excerpt">{a.excerpt}</p>}
        {showMeta && <div className="meta"><span>{relativeDate(a.publishedAt)}</span>{a.sponsored && <span>· <span className="sponsored-label">Contenuto sponsorizzato</span></span>}</div>}
      </div>
    </article>
  );
}
