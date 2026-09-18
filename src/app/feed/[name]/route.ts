import { stripCircles } from '@/lib/circles';
import { articleUrlWith, getCategories, getPublished, getSettings, getUsers } from '@/lib/queries';
import { stripHtml } from '@/lib/utils';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cdata = (s: string) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

/** Feed dedicati: google-news (testo completo per Publisher Center), flipboard e apple-news (RSS con media), podcast (episodi con audio). */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params; const kind = name.replace(/\.xml$/, '');
  if (!['google-news', 'flipboard', 'apple-news', 'podcast'].includes(kind)) return new Response('Not found', { status: 404 });
  const base = siteUrl(); const [s, all, cats, users] = await Promise.all([getSettings(), getPublished(kind === 'podcast' ? 200 : 100), getCategories(), getUsers()]);
  const articles = kind === 'podcast' ? all.filter((a) => a.extra?.audioUrl) : all;
  const items = articles.map((a) => {
    const url = base + articleUrlWith(a, cats); const author = a.byline || users.find((u) => u.id === a.authorId)?.name || s.siteName; const date = new Date(a.publishedAt ?? a.updatedAt).toUTCString(); const cat = cats.find((c) => c.id === a.categoryId)?.name ?? '';
    const media = a.coverImage ? `<media:content url="${esc(a.coverImage)}" medium="image"${a.coverCaption ? ` ><media:description>${cdata(a.coverCaption)}</media:description></media:content>` : ' />'}<enclosure url="${esc(a.coverImage)}" type="image/jpeg" length="0" />` : '';
    if (kind === 'podcast') return `<item><title>${cdata(a.title)}</title><link>${url}</link><guid isPermaLink="false">${a.id}</guid><pubDate>${date}</pubDate><description>${cdata(a.excerpt)}</description><itunes:author>${esc(author)}</itunes:author><itunes:summary>${cdata(a.excerpt)}</itunes:summary>${a.coverImage ? `<itunes:image href="${esc(a.coverImage)}" />` : ''}<enclosure url="${esc(a.extra!.audioUrl!)}" type="audio/mpeg" length="0" />${a.extra?.audioDuration ? `<itunes:duration>${Math.round(a.extra.audioDuration)}</itunes:duration>` : ''}${a.extra?.podcast?.episode ? `<itunes:episode>${a.extra.podcast.episode}</itunes:episode>` : ''}<itunes:explicit>false</itunes:explicit>${(a.extra?.podcast?.chapters ?? []).length ? `<podcast:chapters url="${base}/api/chapters/${a.slug}" type="application/json+chapters" />` : ''}</item>`;
    return `<item><title>${cdata(a.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${date}</pubDate><dc:creator>${cdata(author)}</dc:creator><category>${cdata(cat)}</category><description>${cdata(a.excerpt || stripHtml(stripCircles(a.content)).slice(0, 300))}</description>${kind === 'google-news' || kind === 'apple-news' ? `<content:encoded>${cdata((a.coverImage ? `<figure><img src="${a.coverImage}" alt="${esc(a.title)}" /></figure>` : '') + stripCircles(a.content))}</content:encoded>` : ''}${media}</item>`;
  }).join('\n');
  const head = kind === 'podcast'
    ? `<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(s.siteName)} · Podcast</title><link>${base}/podcast</link><language>it-it</language><description>${esc(s.description)}</description><itunes:author>${esc(s.siteName)}</itunes:author><itunes:explicit>false</itunes:explicit><itunes:category text="News" /><itunes:image href="${base}/api/og/site.png" /><atom:link href="${base}/feed/podcast.xml" rel="self" type="application/rss+xml" />`
    : `<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(s.siteName)}</title><link>${base}</link><language>it-it</language><description>${esc(s.description)}</description><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link href="${base}/feed/${kind}.xml" rel="self" type="application/rss+xml" />`;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${head}\n${items}\n</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
