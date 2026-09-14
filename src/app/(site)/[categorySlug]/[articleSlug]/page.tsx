import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArticleCard, Kicker } from '@/components/site/article-card';
import { CommentForm, Gallery, ReadingProgress, ShareBar, ViewCounter } from '@/components/site/article-extras';
import { MostRead, NewsletterWidget } from '@/components/site/widgets';
import { SmartImage } from '@/components/ui/smart-image';
import { ROLE_LABELS } from '@/lib/models';
import { approvedComments, articleBySlug, articleUrl, category, getPublished, getSettings, related, tag, user } from '@/lib/queries';
import { formatDate, readingTime, relativeDate, timeAgo } from '@/lib/utils';

function shortTime(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const t = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? t : `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ${t}`;
}

export async function generateMetadata({ params }: PageProps<'/[categorySlug]/[articleSlug]'>): Promise<Metadata> {
  const { articleSlug } = await params;
  const a = articleBySlug(articleSlug);
  if (!a) return {};
  const author = user(a.authorId);
  return {
    title: a.seo.title || a.title,
    description: a.seo.description || a.excerpt,
    robots: a.seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: a.seo.canonical || articleUrl(a) },
    openGraph: { type: 'article', title: a.title, description: a.excerpt, images: a.coverImage ? [{ url: a.coverImage }] : [], publishedTime: a.publishedAt ?? undefined, modifiedTime: a.updatedAt, authors: author ? [author.name] : undefined, section: category(a.categoryId)?.name },
    twitter: { card: 'summary_large_image', title: a.title, description: a.excerpt },
  };
}

export default async function ArticlePage({ params }: PageProps<'/[categorySlug]/[articleSlug]'>) {
  const { categorySlug, articleSlug } = await params;
  const a = articleBySlug(articleSlug);
  if (!a) notFound();
  const cat = category(a.categoryId);
  if (cat && cat.slug !== categorySlug) permanentRedirect(articleUrl(a));
  const author = user(a.authorId);
  const tags = a.tagIds.map((id) => tag(id)).filter((t): t is NonNullable<typeof t> => !!t);
  const rel = related(a, 6);
  const comments = approvedComments(a.id);
  const liveUpdates = [...a.liveUpdates].sort((x, y) => y.time.localeCompare(x.time));
  const video = getPublished().find((v) => v.format === 'video' && v.id !== a.id);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, description: a.excerpt, image: a.coverImage ? [a.coverImage] : undefined,
    datePublished: a.publishedAt, dateModified: a.updatedAt, author: author ? [{ '@type': 'Person', name: author.name }] : undefined,
    publisher: { '@type': 'Organization', name: getSettings().siteName }, articleSection: cat?.name, keywords: tags.map((t) => t.name).join(', '),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingProgress />
      <ViewCounter id={a.id} />
      <div className="article-grid">
        <aside className="article-aside">
          {author && (
            <>
              <img className="a-avatar" src={author.avatar} alt={author.name} />
              <Link className="a-name" href={`/autore/${author.id}`}>{author.name}</Link>
              <div className="a-role">{ROLE_LABELS[author.role]}</div>
            </>
          )}
          <div className="a-date">{formatDate(a.publishedAt)}{a.updatedAt > (a.publishedAt || '') && <><br />aggiornato {timeAgo(a.updatedAt)}</>}<br />{readingTime(a.content)} min di lettura</div>
          <ShareBar title={a.title} />
          {tags.length > 0 && <><div className="aside-title">Si parla di</div><div className="topic-list">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name.toLowerCase()}</Link>)}</div></>}
          {rel.length > 0 && <><div className="aside-title">Sullo stesso argomento</div><div className="related-mini">{rel.slice(0, 3).map((r) => <ArticleCard key={r.id} article={r} variant="sm" />)}</div></>}
        </aside>

        <div>
          {video && a.format !== 'video' && (
            <div className="video-box">
              <Link href={articleUrl(video)} className="vb-img"><SmartImage src={video.coverImage} alt={video.title} sizes="200px" /><span className="card-format" style={{ position: 'absolute', right: 8, bottom: 8 }}>▶</span></Link>
              <div className="vb-body"><div className="vb-label">Video del giorno</div><p><Link href={articleUrl(video)}>{video.title}</Link></p></div>
            </div>
          )}
          <header className="article-head">
            <Kicker article={a} />
            <h1>{a.title}</h1>
            <p className="subtitle">{a.subtitle}</p>
            {a.sponsored && <p className="sponsored-label">Contenuto sponsorizzato</p>}
          </header>
          {a.format === 'video' && a.videoUrl ? (
            <iframe className="video-embed" src={a.videoUrl} allowFullScreen loading="lazy" title="Video" />
          ) : a.coverImage ? (
            <figure className="article-cover"><img src={a.coverImage} alt={a.title} width={1200} height={675} fetchPriority="high" />{a.coverCaption && <figcaption>{a.coverCaption}</figcaption>}</figure>
          ) : null}
          {a.format === 'live' && liveUpdates.length > 0 && (
            <section className="live-feed">
              <div className="live-head"><span className="badge badge-live">Live</span> Aggiornamenti in tempo reale</div>
              {liveUpdates.map((u) => <div key={u.id} className="live-item"><time>{shortTime(u.time)}</time><div><h4>{u.title}</h4><p>{u.body}</p></div></div>)}
            </section>
          )}
          {a.format === 'gallery' && a.gallery.length > 0 && <Gallery images={a.gallery} />}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: a.content }} />
          {tags.length > 0 && <div className="article-tags">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>#{t.name}</Link>)}</div>}
          {author && (
            <div className="author-box"><img src={author.avatar} alt={author.name} /><div><div className="role">{ROLE_LABELS[author.role]}</div><h4><Link href={`/autore/${author.id}`}>{author.name}</Link></h4><p>{author.bio}</p></div></div>
          )}
          <section className="section">
            <div className="section-title"><h2>Leggi anche</h2></div>
            <div className="grid grid-2">{rel.slice(0, 4).map((r) => <ArticleCard key={r.id} article={r} variant="horizontal-sm" showMeta />)}</div>
          </section>
          {a.allowComments && (
            <section className="comments">
              <h3>Commenti ({comments.length})</h3>
              {comments.length === 0 && <p style={{ color: 'var(--muted)' }}>Nessun commento. Sii il primo a commentare.</p>}
              {comments.map((c) => <div key={c.id} className="comment"><div className="c-head"><b>{c.authorName}</b><span>{relativeDate(c.createdAt)}</span></div><p>{c.body}</p></div>)}
              <CommentForm articleId={a.id} moderated={getSettings().commentsModeration} />
            </section>
          )}
        </div>

        <aside className="sidebar">
          <MostRead n={5} exclude={a.id} />
          <NewsletterWidget />
          <div className="ad-slot">Spazio pubblicitario 300×250</div>
        </aside>
      </div>
    </>
  );
}
