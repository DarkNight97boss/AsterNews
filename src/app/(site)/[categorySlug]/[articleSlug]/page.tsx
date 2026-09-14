import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { CommentForm, Gallery, ReadingProgress, ShareBar, ViewCounter } from '@/components/site/article-extras';
import { Sidebar } from '@/components/site/sidebar';
import { ROLE_LABELS } from '@/lib/models';
import { approvedComments, articleBySlug, articleUrl, category, getSettings, related, tag, user } from '@/lib/queries';
import { formatDate, readingTime, timeAgo } from '@/lib/utils';

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
    alternates: a.seo.canonical ? { canonical: a.seo.canonical } : { canonical: articleUrl(a) },
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
  const comments = approvedComments(a.id);
  const liveUpdates = [...a.liveUpdates].sort((x, y) => y.time.localeCompare(x.time));
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
      <header className="article-head">
        <Link className="kicker" href={`/${cat?.slug}`} style={{ color: cat?.color }}>{a.kicker || cat?.name}</Link>
        {a.format === 'live' && a.liveActive && <span className="badge badge-live" style={{ marginLeft: 10 }}>Diretta</span>}
        {a.breaking && <span className="badge badge-red" style={{ marginLeft: 10 }}>Ultim&apos;ora</span>}
        <h1>{a.title}</h1>
        <p className="subtitle">{a.subtitle}</p>
        <div className="author-row">
          {author && (
            <>
              <img src={author.avatar} alt={author.name} />
              <div>
                <Link className="author-name" href={`/autore/${author.id}`}>{author.name}</Link>
                <div className="author-meta">{formatDate(a.publishedAt)} · {readingTime(a.content)} min di lettura{a.updatedAt > (a.publishedAt || '') && <> · aggiornato {timeAgo(a.updatedAt)}</>}</div>
              </div>
            </>
          )}
          <ShareBar title={a.title} />
        </div>
        {a.sponsored && <p className="sponsored-label" style={{ marginTop: 10 }}>Contenuto sponsorizzato</p>}
      </header>

      {a.format === 'video' && a.videoUrl ? (
        <div className="article-cover"><iframe className="video-embed" src={a.videoUrl} allowFullScreen loading="lazy" title="Video" /></div>
      ) : a.coverImage ? (
        <figure className="article-cover">
          <img src={a.coverImage} alt={a.title} width={1200} height={675} fetchPriority="high" />
          {a.coverCaption && <figcaption>{a.coverCaption}</figcaption>}
        </figure>
      ) : null}

      <div className="article-layout">
        <div>
          {a.format === 'live' && liveUpdates.length > 0 && (
            <section className="live-feed">
              <div className="live-head"><span className="badge badge-live">Live</span> Aggiornamenti in tempo reale</div>
              {liveUpdates.map((u) => (
                <div key={u.id} className="live-item"><time>{shortTime(u.time)}</time><div><h4>{u.title}</h4><p>{u.body}</p></div></div>
              ))}
            </section>
          )}
          {a.format === 'gallery' && a.gallery.length > 0 && <Gallery images={a.gallery} />}
          <div className="article-body" dangerouslySetInnerHTML={{ __html: a.content }} />

          {tags.length > 0 && <div className="article-tags">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>#{t.name}</Link>)}</div>}
          {author && (
            <div className="author-box">
              <img src={author.avatar} alt={author.name} />
              <div><div className="role">{ROLE_LABELS[author.role]}</div><h4><Link href={`/autore/${author.id}`}>{author.name}</Link></h4><p>{author.bio}</p></div>
            </div>
          )}
          <section className="section">
            <div className="section-title"><h2>Leggi anche</h2></div>
            <div className="grid grid-2">{related(a, 4).map((r) => <ArticleCard key={r.id} article={r} variant="horizontal" />)}</div>
          </section>
          {a.allowComments && (
            <section className="comments">
              <h3>Commenti ({comments.length})</h3>
              {comments.length === 0 && <p style={{ color: 'var(--gray-500)' }}>Nessun commento. Sii il primo a commentare.</p>}
              {comments.map((c) => (
                <div key={c.id} className="comment"><div className="c-head"><b>{c.authorName}</b><span>{timeAgo(c.createdAt)}</span></div><p>{c.body}</p></div>
              ))}
              <CommentForm articleId={a.id} moderated={getSettings().commentsModeration} />
            </section>
          )}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
