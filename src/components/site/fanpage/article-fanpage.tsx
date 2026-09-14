import Link from 'next/link';
import { CommentForm, Gallery, ShareBar } from '@/components/site/article-extras';
import { NewsletterForm } from '@/components/site/newsletter-form';
import { ArticleCard } from '@/components/site/article-card';
import { Article, Category, Comment, ROLE_LABELS, Tag, User, Zone } from '@/lib/models';
import { articleUrl, getMostRead, getPublished } from '@/lib/queries';
import { formatDate, relativeDate } from '@/lib/utils';
import { FpPhotoCard } from './home-fanpage';

interface Props { a: Article; cat?: Category; author?: User; tags: Tag[]; rel: Article[]; comments: Comment[]; zone?: Zone; moderated: boolean; googleNewsUrl: string; siteName: string }

function shortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function ArticleFanpage({ a, cat, author, tags, rel, comments, zone, moderated, googleNewsUrl, siteName }: Props) {
  const liveUpdates = [...a.liveUpdates].sort((x, y) => y.time.localeCompare(x.time));
  const video = getPublished().find((v) => v.format === 'video' && v.id !== a.id);
  const most = getMostRead().filter((m) => m.id !== a.id).slice(0, 5);
  return (
    <div className="fp-article">
      <div className="fp-article-main">
        <div className="fp-crumbs">{cat && <Link href={`/${cat.slug}`}>{cat.name}</Link>}{zone && <> › <Link href={`/zone/${zone.slug}`}>{zone.name}</Link></>}{a.kicker && <> › <span>{a.kicker}</span></>}</div>
        <h1>{a.title}</h1>
        <div className="fp-date">{formatDate(a.publishedAt)}{a.updatedAt > (a.publishedAt || '') && <> · aggiornato {relativeDate(a.updatedAt)}</>}</div>
        <div className="fp-author-row">
          {author && <><img src={author.avatar} alt={author.name} /><span>A cura di <b><Link href={`/autore/${author.id}`}>{author.name}</Link></b></span></>}
          <div className="fp-share"><ShareBar title={a.title} withMail /></div>
        </div>
        {a.format === 'video' && a.videoUrl ? (
          <iframe className="video-embed" src={a.videoUrl} allowFullScreen loading="lazy" title="Video" />
        ) : a.coverImage ? (
          <figure className="article-cover"><img src={a.coverImage} alt={a.title} width={1200} height={675} fetchPriority="high" />{a.coverCaption && <figcaption>{a.coverCaption}</figcaption>}</figure>
        ) : null}
        <p className="fp-lead">{a.subtitle}</p>
        {a.format === 'live' && liveUpdates.length > 0 && (
          <section className="live-feed"><div className="live-head"><span className="badge badge-live">Live</span> Aggiornamenti in tempo reale</div>{liveUpdates.map((u) => <div key={u.id} className="live-item"><time>{shortTime(u.time)}</time><div><h4>{u.title}</h4><p>{u.body}</p></div></div>)}</section>
        )}
        {a.format === 'gallery' && a.gallery.length > 0 && <Gallery images={a.gallery} />}
        <div className="article-body" dangerouslySetInnerHTML={{ __html: a.content }} />
        {rel[0] && <div className="fp-leggi"><span>Leggi anche</span><Link href={articleUrl(rel[0])} className="fp-highlight">{rel[0].title}</Link></div>}
        {tags.length > 0 && <div className="article-tags">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>#{t.name}</Link>)}</div>}
        {googleNewsUrl && <p className="fp-gnews">Scegli <a href={googleNewsUrl} target="_blank" rel="noopener">{siteName}</a> come fonte preferita su Google News</p>}
        <div className="fp-foot"><span>© Riproduzione riservata</span><ShareBar title={a.title} withMail /></div>
        {author && (
          <div className="author-box"><img src={author.avatar} alt={author.name} /><div><div className="role">{ROLE_LABELS[author.role]}</div><h4><Link href={`/autore/${author.id}`}>{author.name}</Link></h4><p>{author.bio}</p></div></div>
        )}
        {a.allowComments && (
          <section className="comments">
            <h3>Commenti ({comments.length})</h3>
            {comments.length === 0 && <p style={{ color: 'var(--muted)' }}>Nessun commento. Sii il primo a commentare.</p>}
            {comments.map((c) => <div key={c.id} className="comment"><div className="c-head"><b>{c.authorName}</b><span>{relativeDate(c.createdAt)}</span></div><p>{c.body}</p></div>)}
            <CommentForm articleId={a.id} moderated={moderated} />
          </section>
        )}
      </div>
      <aside className="fp-article-side">
        {rel.slice(1, 3).map((r) => <FpPhotoCard key={r.id} a={r} />)}
        {video && <FpPhotoCard a={video} badge="▶ Video" />}
        <div className="fp-card fp-side-card"><div className="fp-card-head"><h2 className="fp-title">I più letti</h2></div>{most.map((m, i) => <ArticleCard key={m.id} article={m} variant="number" index={i + 1} />)}</div>
        <div className="fp-card fp-side-card fp-newsletter" id="newsletter"><h3>La newsletter</h3><p>Le notizie più importanti, ogni mattina alle 7.</p><NewsletterForm /></div>
      </aside>
    </div>
  );
}
