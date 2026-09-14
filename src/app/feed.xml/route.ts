import { articleUrl, getPublished, getSettings, user } from '@/lib/queries';
import { stripHtml } from '@/lib/utils';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const s = getSettings();
  const items = getPublished().slice(0, 50).map((a) => `
    <item>
      <title>${esc(a.title)}</title>
      <link>${base}${articleUrl(a)}</link>
      <guid isPermaLink="true">${base}${articleUrl(a)}</guid>
      <pubDate>${new Date(a.publishedAt ?? a.updatedAt).toUTCString()}</pubDate>
      <dc:creator>${esc(user(a.authorId)?.name ?? s.siteName)}</dc:creator>
      <description>${esc(a.excerpt || stripHtml(a.content).slice(0, 300))}</description>
      ${a.coverImage.startsWith('http') ? `<enclosure url="${esc(a.coverImage)}" type="image/jpeg" />` : ''}
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(s.siteName)}</title>
    <link>${base}</link>
    <description>${esc(s.description)}</description>
    <language>it-it</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
