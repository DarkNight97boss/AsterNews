import { stripCircles } from '@/lib/circles';
import { articleUrlWith, getCategories, getPublished, getSettings, getUsers } from '@/lib/queries';
import { stripHtml } from '@/lib/utils';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export async function GET() {
  const base = siteUrl();
  const [s, articles, cats, users] = await Promise.all([getSettings(), getPublished(50), getCategories(), getUsers()]);
  const items = articles.map((a) => `
    <item><title>${esc(a.title)}</title><link>${base}${articleUrlWith(a, cats)}</link><guid isPermaLink="true">${base}${articleUrlWith(a, cats)}</guid><pubDate>${new Date(a.publishedAt ?? a.updatedAt).toUTCString()}</pubDate><dc:creator>${esc(users.find((u) => u.id === a.authorId)?.name ?? s.siteName)}</dc:creator><description>${esc(a.excerpt || stripHtml(stripCircles(a.content)).slice(0, 300))}</description>${a.coverImage.startsWith('http') ? `<enclosure url="${esc(a.coverImage)}" type="image/jpeg" />` : ''}</item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(s.siteName)}</title><link>${base}</link><description>${esc(s.description)}</description><language>it-it</language><atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
