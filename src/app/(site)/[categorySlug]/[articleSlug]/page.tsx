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
import { LiveFeed } from '@/components/site/live-feed';
import { RecommendStrip } from '@/components/site/recommend-strip';
import { ArticleTools } from '@/components/site/article-tools';
import { DepthSlider } from '@/components/site/depth-slider';
import { canSeeArticle } from '@/lib/circles';
import { TrustPanel, VerificationBadge } from '@/components/site/trust-panel';
import { AttentionTracker } from '@/components/site/attention-tracker';
import { recordRead } from '@/lib/trust-notify';
import { buildToc, wordCount } from '@/lib/content-render';
import { listRevisions } from '@/lib/repo-extra';
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
    robots: a.seo.noIndex || a.extra?.circle ? { index: false, follow: false } : undefined,
    alternates: { canonical: a.seo.canonical || articleUrl(a), ...(await (await import('@/lib/hreflang')).hreflangFor(a)) },
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
  const [viewerReader, staffUser] = await Promise.all([getCurrentReader(), (await import('@/lib/auth')).getCurrentUser()]);
  const viewer = { staff: !!staffUser, circles: viewerReader?.prefs?.circles ?? [] }; const circleName = (settings.circles ?? []).find((c) => c.id === a.extra?.circle)?.name ?? '';
  const locked = !canSeeArticle(a.extra?.circle, viewer);
  if (viewerReader && !locked) void recordRead(viewerReader.id, a.id);
  const layered = a.content.includes('class="layered"'); const wordsAt = (d: number) => Math.max(1, Math.round(wordCount(a.content.replace(/<div data-depth="(\d)">[\s\S]*?<\/div>/g, (m, n) => (Number(n) === d ? m : ''))) / 200));
  const revs = a.extra?.hideBlackBox || settings.adapt?.blackBox === false ? [] : await listRevisions(a.id, 50);
  const box = revs.length || a.extra?.sources?.length || a.extra?.aiUsed?.length ? { revisions: revs.length, started: revs.length ? revs[revs.length - 1].createdAt : a.createdAt, sources: a.extra?.sources?.length ?? 0, verified: (a.extra?.sources ?? []).filter((x) => x.verified).length, ai: a.extra?.aiUsed ?? [], corrections: a.extra?.corrections?.length ?? 0, words: wordCount(a.content) } : null;
  const fieldDefs = (settings.customFields?.[a.categoryId] ?? []).filter((f) => a.extra?.fields?.[f.key]);
  const toc = wordCount(a.content) >= 900 ? buildToc(a.content) : [];
  const langLinks = await (await import('@/lib/hreflang')).languageLinks(a);
  const storyOk = [a.coverImage, ...a.gallery].filter(Boolean).length >= 2;
  const history = a.extra?.showHistory ? (await listRevisions(a.id, 20)).filter((r) => r.data?.status === 'published') : [];
  const video = videos[0];
  const featured = featuredAll.filter((f) => f.id !== a.id).slice(0, 4);
  const mostWeek = mostAll.filter((m) => m.id !== a.id).slice(0, 6);
  const base0 = siteUrl();
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org', '@type': a.format === 'live' ? 'LiveBlogPosting' : 'NewsArticle', ...(a.extra?.corrections?.length ? { correction: a.extra.corrections.map((c) => c.text).join(' | ') } : {}), headline: a.title, description: a.excerpt, image: a.coverImage ? [a.coverImage] : undefined,
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
      <AttentionTracker category={cat?.name ?? 'Altro'} />
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
            <VerificationBadge a={a} />
            {langLinks.length > 0 && <p className="lang-switch">Leggi in: {langLinks.map((l) => <Link key={l.lang} href={l.url} hrefLang={l.lang}>{l.label}</Link>)}</p>}
            {a.sponsored && <p className="sponsored-label">Contenuto sponsorizzato</p>}
          </header>
          {a.format === 'video' && a.videoUrl ? (
            <iframe className="video-embed" src={a.videoUrl} allowFullScreen loading="lazy" title="Video" />
          ) : a.coverImage ? (
            <figure className="article-cover"><div className="cover-frame"><SmartImage src={a.coverImage} alt={a.title} priority slot="cover" /></div>{a.coverCaption && <figcaption>{a.coverCaption}</figcaption>}</figure>
          ) : null}
          <ArticleTools articleId={a.id} title={a.title} url={articleUrl(a)} audioUrl={a.extra?.audioUrl} />
          {a.extra?.audioUrl && <div className="audio-article"><span>🎧 Ascolta l&apos;articolo{a.extra.audioDuration ? ` · ${Math.max(1, Math.round(a.extra.audioDuration / 60))} min` : ''}</span><audio controls preload="none" src={a.extra.audioUrl} /></div>}
          {a.format === 'live' && <LiveFeed articleId={a.id} initial={liveUpdates} active={a.liveActive} />}
          {fieldDefs.length > 0 && <dl className="article-fields">{fieldDefs.map((f) => { const v = a.extra?.fields?.[f.key]; if (!v) return null; return <div key={f.key}><dt>{f.label}</dt><dd>{f.type === 'rating' ? <span className="stars" aria-label={`${v} su 5`}>{'★'.repeat(Number(v))}{'☆'.repeat(5 - Number(v))}</span> : f.type === 'url' ? <a href={v} target="_blank" rel="noopener">{v.replace(/^https?:\/\//, '')}</a> : v}</dd></div>; })}</dl>}
          {toc.length >= 3 && <nav className="toc-box" aria-label="Indice"><b>In questo articolo</b><ol>{toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.text}</a></li>)}</ol></nav>}
          {a.format === 'gallery' && a.gallery.length > 0 && <Gallery images={a.gallery} />}
          {layered && !locked && <DepthSlider minutes={[wordsAt(1), wordsAt(2), wordsAt(3)]} />}
          {locked ? <div className="circle-gate"><h3>🔒 Questo testo è riservato a «{circleName}»</h3><p>L&apos;autore lo condivide solo con un gruppo di persone. Se hai ricevuto una chiave d&apos;invito, aprila dopo aver effettuato l&apos;accesso.</p><Link className="btn btn-primary" href={`/account?redirect=${encodeURIComponent(articleUrl(a))}`}>Accedi</Link></div> : gated ? <Paywall articleId={a.id} premiumOnly={!!a.premium} price={paywall.monthlyPrice} free={paywall.freeArticles}><ArticleBody html={a.content} viewer={viewer} faq={a.faq} articleId={a.id} inlineAd={<AdSlot slot="article_inline" size="728×90" className="ad-inline" />} /></Paywall> : <ArticleBody html={a.content} viewer={viewer} articleId={a.id} faq={a.faq} inlineAd={<AdSlot slot="article_inline" size="728×90" className="ad-inline" />} />}
          {(a.extra?.corrections?.length ?? 0) > 0 && <section className="corrections-box" aria-label="Correzioni"><b>Correzioni</b>{a.extra!.corrections!.map((c, i) => <p key={i}><time dateTime={c.date}>{new Date(c.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</time> · {c.text}</p>)}</section>}
          {!locked && <TrustPanel a={a} author={author ?? undefined} settings={settings} revisions={box?.revisions ?? 0} />}
          {box && !locked && <details className="black-box"><summary>Come è nato questo articolo</summary><dl><div><dt>Lavorazione</dt><dd>iniziato il {new Date(box.started).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}, {box.revisions} {box.revisions === 1 ? 'versione salvata' : 'versioni salvate'}</dd></div><div><dt>Lunghezza</dt><dd>{box.words} parole</dd></div>{box.sources > 0 && <div><dt>Fonti</dt><dd>{box.sources} consultate, {box.verified} verificate direttamente</dd></div>}<div><dt>Intelligenza artificiale</dt><dd>{box.ai.length ? `l'assistente ha proposto: ${box.ai.map((k) => ({ title: 'titolo', subtitle: 'sommario', excerpt: 'estratto', seo: 'descrizione per i motori', tagIds: 'tag', kicker: 'occhiello', content: 'parti del testo', coverCaption: 'didascalia' }[k] ?? k)).join(', ')}; un giornalista ha rivisto e approvato tutto` : 'nessun uso per questo articolo'}</dd></div>{box.corrections > 0 && <div><dt>Correzioni</dt><dd>{box.corrections}, elencate sopra</dd></div>}</dl></details>}
          {history.length > 0 && <details className="update-history"><summary>Cronologia degli aggiornamenti ({history.length})</summary><ul>{history.map((h) => <li key={h.id}><time dateTime={h.createdAt}>{new Date(h.createdAt).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>{h.note ? ` · ${h.note}` : ''}</li>)}</ul></details>}
          <AdSlot slot="article_bottom" size="728×90" className="ad-inline" />
          {settings.googleNewsUrl && <p className="gnews" style={{ fontFamily: 'var(--font-serif)', textAlign: 'center', marginTop: 24 }}>Scegli <a href={settings.googleNewsUrl} target="_blank" rel="noopener" style={{ color: 'var(--red)', textDecoration: 'underline' }}>{settings.siteName}</a> come fonte preferita su Google News</p>}
          <div className="article-foot"><span className="copy">© Riproduzione riservata{storyOk && <> · <a href={`/storie/${a.slug}`} className="story-link">📱 Guarda la Web Story</a></>}</span><ShareBar title={a.title} withMail /></div>
          {tags.length > 0 && <div className="article-tags">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>#{t.name}</Link>)}</div>}
          {author && (
            <div className="author-box"><img src={author.avatar} alt={author.name} /><div><div className="role">{ROLE_LABELS[author.role]}</div><h3><Link href={`/autore/${author.id}`}>{author.name}</Link></h3><p>{author.bio}</p></div></div>
          )}
          <RecommendStrip categorySlug={categorySlug} currentId={a.id} />
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
