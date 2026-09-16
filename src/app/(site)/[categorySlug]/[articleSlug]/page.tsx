import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { ArticleCard, Kicker } from '@/components/site/article-card';
import { CommentForm, Gallery, ReadingProgress, ShareBar, ViewCounter } from '@/components/site/article-extras';
import { MostRead, NewsletterWidget } from '@/components/site/widgets';
import { SmartImage } from '@/components/ui/smart-image';
import { ROLE_LABELS } from '@/lib/models';
import { approvedComments, articleBySlug, articleUrlWith, category, getCategories, getFeatured, getMostRead, getSettings, legacyRedirectFor, listPublished, related, tagsByIds, user, zone } from '@/lib/queries';
import { formatDate, readingTime, relativeDate, timeAgo } from '@/lib/utils';
import { getActiveTheme } from '@/lib/theme-server';
import { ArticleFanpage } from '@/components/site/fanpage/article-fanpage';
import { siteUrl } from '@/lib/site-url';
import { ArticleBody } from '@/components/site/article-body';
import { AdSlot } from '@/components/site/ad-slot';
import { Paywall } from '@/components/site/paywall';
import { Analytics } from '@/components/site/analytics';
import { getCurrentReader } from '@/lib/auth';
import { DEFAULT_COMMUNITY, DEFAULT_PAYWALL } from '@/lib/models';
import { CommentsThread } from '@/components/site/comments-thread';
import { SaveButton } from '@/components/site/save-button';
import { DonateWidget } from '@/components/site/donate-widget';
import { isBookmarked, votedCommentIds } from '@/lib/repo-extra3';
import { getUsers } from '@/lib/queries';

function shortTime(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const t = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? t : `${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })} ${t}`;
}

export async function generateMetadata({ params }: PageProps<'/[categorySlug]/[articleSlug]'>): Promise<Metadata> {
  const { articleSlug } = await params;
  const a = await articleBySlug(articleSlug);
  if (!a) return {};
  const [author, cats, tags] = await Promise.all([user(a.authorId), getCategories(), tagsByIds(a.tagIds)]);
  const articleUrl = (x: typeof a) => articleUrlWith(x, cats);
  return {
    title: a.seo.title || a.title,
    description: a.seo.description || a.excerpt,
    keywords: [a.seo.focusKeyword, ...tags.map((t) => t.name)].filter((k): k is string => !!k),
    robots: a.seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: a.seo.canonical || articleUrl(a) },
    openGraph: { type: 'article', title: a.title, description: a.excerpt, images: a.coverImage ? [{ url: a.coverImage }, { url: `/api/og/${a.id}.png`, width: 1200, height: 630 }] : [{ url: `/api/og/${a.id}.png`, width: 1200, height: 630 }], publishedTime: a.publishedAt ?? undefined, modifiedTime: a.updatedAt, authors: author ? [author.name] : undefined, section: cats.find((c) => c.id === a.categoryId)?.name },
    twitter: { card: 'summary_large_image', title: a.title, description: a.excerpt },
  };
}

export default async function ArticlePage({ params }: PageProps<'/[categorySlug]/[articleSlug]'>) {
  const { categorySlug, articleSlug } = await params;
  const a = await articleBySlug(articleSlug);
  if (!a) { const t = await legacyRedirectFor(`${categorySlug}/${articleSlug}`); if (t) permanentRedirect(t); notFound(); }
  const cats = await getCategories();
  const articleUrl = (x: typeof a) => articleUrlWith(x, cats);
  const cat = cats.find((c) => c.id === a.categoryId);
  if (cat && cat.slug !== categorySlug) permanentRedirect(articleUrl(a));
  const [author, tags, rel, comments, videos, z, featuredAll, mostAll, settings] = await Promise.all([user(a.authorId), tagsByIds(a.tagIds), related(a, 6), approvedComments(a.id), listPublished({ format: 'video', excludeIds: [a.id] }, 1), zone(a.zoneId), getFeatured(5), getMostRead(7), getSettings()]);
  const liveUpdates = [...a.liveUpdates].sort((x, y) => y.time.localeCompare(x.time));
  const video = videos[0];
  const featured = featuredAll.filter((f) => f.id !== a.id).slice(0, 4);
  const mostWeek = mostAll.filter((m) => m.id !== a.id).slice(0, 6);
  const base0 = siteUrl();
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': a.format === 'live' ? 'LiveBlogPosting' : 'NewsArticle', headline: a.title, description: a.excerpt, image: a.coverImage ? [a.coverImage] : undefined,
    datePublished: a.publishedAt, dateModified: a.updatedAt, author: author ? [{ '@type': 'Person', name: author.name, url: `${base0}/autore/${author.id}` }] : undefined,
    publisher: { '@type': 'Organization', name: settings.siteName, logo: { '@type': 'ImageObject', url: `${base0}/icon.png` } }, articleSection: cat?.name, keywords: tags.map((t) => t.name).join(', '),
    mainEntityOfPage: `${base0}${articleUrlWith(a, cats)}`, isAccessibleForFree: !a.premium, ...(a.premium ? { hasPart: { '@type': 'WebPageElement', isAccessibleForFree: false, cssSelector: '.article-body' } } : {}),
    ...(a.format === 'live' ? { coverageStartTime: a.publishedAt, coverageEndTime: a.liveActive ? undefined : a.updatedAt, liveBlogUpdate: a.liveUpdates.map((u) => ({ '@type': 'BlogPosting', headline: u.title, articleBody: u.body, datePublished: u.time })) } : {}),
    ...(a.format === 'video' && a.videoUrl ? { video: { '@type': 'VideoObject', name: a.title, description: a.excerpt, thumbnailUrl: a.coverImage ? [a.coverImage] : undefined, uploadDate: a.publishedAt, embedUrl: a.videoUrl } } : {}),
  };
  const faqLd = a.faq && a.faq.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;

  const base = siteUrl();
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: settings.siteName, item: `${base}/` },
    ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat.name, item: `${base}/${cat.slug}` }] : []),
    { '@type': 'ListItem', position: cat ? 3 : 2, name: a.title, item: `${base}${articleUrl(a)}` },
  ] };
  const reader = await getCurrentReader();
  const [saved, votedIds, allUsers] = await Promise.all([reader ? isBookmarked(reader.id, a.id) : Promise.resolve(false), reader ? votedCommentIds(reader.id, a.id) : Promise.resolve([] as string[]), getUsers()]);
  const coauthors = allUsers.filter((u) => (a.coauthorIds ?? []).includes(u.id));
  const paywall = { ...DEFAULT_PAYWALL, ...(settings.paywall ?? {}) };
  const community = { ...DEFAULT_COMMUNITY, ...(settings.community ?? {}) };
  const gated = paywall.enabled && !reader?.premium;
  const { theme } = await getActiveTheme();
  if (theme.skin === 'fanpage') {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
        <ReadingProgress />
        <ViewCounter id={a.id} />
        <ArticleFanpage a={a} cat={cat} author={author} tags={tags} rel={rel} comments={comments} zone={z} moderated={settings.commentsModeration} googleNewsUrl={settings.googleNewsUrl} siteName={settings.siteName} />
      </>
    );
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <ReadingProgress />
      <ViewCounter id={a.id} />
      <Analytics articleId={a.id} />
      <div className="article-grid">
        <aside className="article-aside">
          {a.byline ? <div className="a-name">{a.byline}</div> : author && (
            <>
              <img className="a-avatar" src={author.avatar} alt={author.name} />
              <Link className="a-name" href={`/autore/${author.id}`}>{author.name}</Link>
              {coauthors.map((c) => <Link key={c.id} className="a-name a-coauthor" href={`/autore/${c.id}`}>e {c.name}</Link>)}
              <div className="a-role">{ROLE_LABELS[author.role]}</div>
            </>
          )}
          <SaveButton articleId={a.id} saved={saved} loggedIn={!!reader} />
          <div className="a-date">{formatDate(a.publishedAt)}{a.updatedAt > (a.publishedAt || '') && <><br />aggiornato {timeAgo(a.updatedAt)}</>}<br />{readingTime(a.content)} min di lettura</div>
          <ShareBar title={a.title} />
          {tags.length > 0 && <><div className="aside-title">Si parla di</div><div className="topic-list">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name.toLowerCase()}</Link>)}</div></>}
          {rel.length > 0 && <><div className="aside-title">Sullo stesso argomento</div><div className="related-mini">{rel.slice(0, 3).map((r) => <ArticleCard key={r.id} article={r} variant="sm" />)}</div></>}
        </aside>

        <div>
          {video && a.format !== 'video' && (
            <div className="video-box">
              <Link href={articleUrl(video)} className="vb-img"><SmartImage src={video.coverImage} alt={video.title} sizes="(max-width: 768px) 92vw, 200px" /><span className="card-format" style={{ position: 'absolute', right: 8, bottom: 8 }}>▶</span></Link>
              <div className="vb-body"><div className="vb-label">Video del giorno</div><p><Link href={articleUrl(video)}>{video.title}</Link></p></div>
            </div>
          )}
          <header className="article-head">
            <Kicker article={a} />
            {(z || a.address) && <span className="article-place">{z && <Link href={`/zone/${z.slug}`}>{z.name}</Link>}{z && a.address && ' / '}{a.address}</span>}
            <h1>{a.title}</h1>
            <p className="subtitle">{a.subtitle}</p>
            {a.sponsored && <p className="sponsored-label">Contenuto sponsorizzato</p>}
          </header>
          {a.format === 'video' && a.videoUrl ? (
            <iframe className="video-embed" src={a.videoUrl} allowFullScreen loading="lazy" title="Video" />
          ) : a.coverImage ? (
            <figure className="article-cover"><div className="cover-frame"><SmartImage src={a.coverImage} alt={a.title} priority slot="cover" /></div>{a.coverCaption && <figcaption>{a.coverCaption}</figcaption>}</figure>
          ) : null}
          {a.format === 'live' && liveUpdates.length > 0 && (
            <section className="live-feed">
              <div className="live-head"><span className="badge badge-live">Live</span> Aggiornamenti in tempo reale</div>
              {liveUpdates.map((u) => <div key={u.id} className="live-item"><time>{shortTime(u.time)}</time><div><h4>{u.title}</h4><p>{u.body}</p></div></div>)}
            </section>
          )}
          {a.format === 'gallery' && a.gallery.length > 0 && <Gallery images={a.gallery} />}
          {gated ? <Paywall articleId={a.id} premiumOnly={!!a.premium} price={paywall.monthlyPrice} free={paywall.freeArticles}><ArticleBody html={a.content} faq={a.faq} inlineAd={<AdSlot slot="article_inline" size="728×90" className="ad-inline" />} /></Paywall> : <ArticleBody html={a.content} faq={a.faq} inlineAd={<AdSlot slot="article_inline" size="728×90" className="ad-inline" />} />}
          <AdSlot slot="article_bottom" size="728×90" className="ad-inline" />
          {settings.googleNewsUrl && <p className="gnews" style={{ fontFamily: 'var(--font-serif)', textAlign: 'center', marginTop: 24 }}>Scegli <a href={settings.googleNewsUrl} target="_blank" rel="noopener" style={{ color: 'var(--red)', textDecoration: 'underline' }}>{settings.siteName}</a> come fonte preferita su Google News</p>}
          <div className="article-foot"><span className="copy">© Riproduzione riservata</span><ShareBar title={a.title} withMail /></div>
          {tags.length > 0 && <div className="article-tags">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>#{t.name}</Link>)}</div>}
          {author && (
            <div className="author-box"><img src={author.avatar} alt={author.name} /><div><div className="role">{ROLE_LABELS[author.role]}</div><h3><Link href={`/autore/${author.id}`}>{author.name}</Link></h3><p>{author.bio}</p></div></div>
          )}
          <section className="section">
            <div className="section-title"><h2>Leggi anche</h2></div>
            <div className="grid grid-2">{rel.slice(0, 4).map((r) => <ArticleCard key={r.id} article={r} variant="horizontal-sm" showMeta />)}</div>
          </section>
          {featured.length > 0 && (
            <section className="section"><div className="section-title"><h2>In evidenza</h2></div><div className="grid grid-4 grid-divided">{featured.map((f) => <ArticleCard key={f.id} article={f} variant="sm" />)}</div></section>
          )}
          {mostWeek.length > 0 && (
            <section className="section"><div className="section-title"><h2>I più letti della settimana</h2></div><div className="most-week">{mostWeek.map((m, i) => <ArticleCard key={m.id} article={m} variant="number" index={i + 1} />)}</div></section>
          )}
          {a.allowComments && (
            <section className="comments">
              <h3>Commenti ({comments.length})</h3>
              {comments.length === 0 && <p style={{ color: 'var(--muted)' }}>Nessun commento. Sii il primo a commentare.</p>}
              <CommentsThread articleId={a.id} comments={comments} votedIds={votedIds} canReply={!community.commentsRequireAccount || !!reader} readerName={reader?.name || reader?.email || ''} />
              <CommentForm articleId={a.id} moderated={settings.commentsModeration} readerName={reader?.name || reader?.email || ''} requireAccount={community.commentsRequireAccount} />
            </section>
          )}
        </div>

        <aside className="sidebar">
          <MostRead n={5} exclude={a.id} />
          <NewsletterWidget />
          <AdSlot slot="sidebar_300" />
          <DonateWidget />
        </aside>
      </div>
    </>
  );
}
