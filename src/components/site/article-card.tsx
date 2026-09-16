import Link from 'next/link';
import { Article, Category, ROLE_LABELS, User } from '@/lib/models';
import { articleUrlWith, getCategories, getUsers } from '@/lib/queries';
import { relativeDate } from '@/lib/utils';
import { SmartImage } from '@/components/ui/smart-image';

export type CardVariant = 'hero' | 'md' | 'sm' | 'horizontal' | 'horizontal-sm' | 'compact' | 'number' | 'city' | 'opinion' | 'overlay' | 'overlay-sm';
interface Props { article: Article; variant?: CardVariant; index?: number; showExcerpt?: boolean; showMeta?: boolean; showImage?: boolean; priority?: boolean }

export function KickerView({ article: a, cat, className = 'kicker' }: { article: Article; cat?: Category; className?: string }) {
  return (
    <span className={`${className} ${cat?.kind === 'dossier' ? 'kicker-dossier' : ''}`}>
      {cat?.kind === 'dossier' && <span className="badge badge-yellow">Dossier</span>}
      {a.format === 'live' && a.liveActive && <span className="badge badge-live">Diretta</span>}
      {a.breaking && !(a.format === 'live' && a.liveActive) && <span className="badge badge-red">Ultim&apos;ora</span>}
      <Link href={`/${cat?.slug ?? ''}`}>{a.kicker || cat?.name}</Link>
    </span>
  );
}
/** Occhiello (server): risolve la categoria da solo. */
export async function Kicker({ article, className }: { article: Article; className?: string }) {
  const cat = (await getCategories()).find((c) => c.id === article.categoryId);
  return <KickerView article={article} cat={cat} className={className} />;
}

export function ArticleCardView({ article: a, cat, author, variant = 'md', index = 0, showExcerpt = false, showMeta = false, showImage = true, priority = false }: Props & { cat?: Category; author?: User }) {
  const link = `/${cat?.slug ?? 'notizie'}/${a.slug}`;
  const cls = `card card-${variant}`;
  if (variant === 'city') return <article className={cls}><h3 className="card-title"><Link href={link}><span className="city">{a.kicker || cat?.name}</span>{a.title}</Link></h3></article>;
  if (variant === 'number') return <article className={cls}><span className="num">{index}</span><div className="card-body"><KickerView article={a} cat={cat} /><h3 className="card-title"><Link href={link}>{a.title}</Link></h3></div></article>;
  if (variant === 'opinion') {
    return (
      <article className={cls}>
        {author && <div className="op-head"><img src={author.avatar} alt={author.name} loading="lazy" decoding="async" width={48} height={48} /><div><Link className="op-name" href={`/autore/${author.id}`}>{author.name}</Link><div className="op-role">{ROLE_LABELS[author.role]}</div></div></div>}
        <h3 className="card-title"><Link href={link}>{a.title}</Link></h3>
        {showExcerpt && <p className="card-excerpt">{a.excerpt}</p>}
      </article>
    );
  }
  if (variant === 'overlay' || variant === 'overlay-sm') {
    return (
      <article className={`card card-overlay ${variant === 'overlay-sm' ? 'card-overlay-sm' : ''}`}>
        <Link className="card-img" href={link} aria-label={a.title}><SmartImage src={a.coverImage} alt={a.title} priority={priority} sizes={variant === 'overlay' ? '(max-width: 768px) 100vw, 800px' : '(max-width: 520px) 100vw, (max-width: 768px) 50vw, 400px'} />{a.format === 'video' && <span className="card-format">▶</span>}</Link>
        <div className="card-body"><KickerView article={a} cat={cat} /><h3 className="card-title"><Link href={link}>{a.title}</Link></h3>{showExcerpt && variant === 'overlay' && <p className="card-excerpt">{a.excerpt}</p>}{showMeta && <div className="meta"><span>{relativeDate(a.publishedAt)}</span></div>}</div>
      </article>
    );
  }
  return (
    <article className={cls}>
      {showImage && variant !== 'compact' && (
        <Link className="card-img" href={link} aria-label={a.title}>
          <SmartImage src={a.coverImage} alt={a.title} priority={priority} sizes={variant === 'horizontal-sm' ? '130px' : variant === 'horizontal' ? '(max-width: 520px) 100vw, 280px' : '(max-width: 520px) 100vw, (max-width: 768px) 50vw, 600px'} />
          {a.format === 'video' && <span className="card-format">▶</span>}{a.format === 'gallery' && <span className="card-format">▦</span>}
        </Link>
      )}
      <div className="card-body">
        <KickerView article={a} cat={cat} />
        <h3 className="card-title"><Link href={link}>{a.title}</Link></h3>
        {showExcerpt && <p className="card-excerpt">{a.excerpt}</p>}
        {showMeta && <div className="meta"><span>{relativeDate(a.publishedAt)}</span>{a.sponsored && <span>· <span className="sponsored-label">Contenuto sponsorizzato</span></span>}</div>}
      </div>
    </article>
  );
}

/** Card articolo (server component asincrono): risolve categoria e autore. */
export async function ArticleCard(props: Props) {
  const [cats, users] = await Promise.all([getCategories(), getUsers()]);
  return <ArticleCardView {...props} cat={cats.find((c) => c.id === props.article.categoryId)} author={users.find((u) => u.id === props.article.authorId)} />;
}
export { articleUrlWith };
