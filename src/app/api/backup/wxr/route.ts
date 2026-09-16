import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings, getUsers } from '@/lib/queries';
import { listArticles, listTags } from '@/lib/repo';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cdata = (s: string) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
const wpDate = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 19).replace('T', ' ') : '0000-00-00 00:00:00');

/** Esportazione in formato WordPress eXtended RSS (WXR 1.2): categorie, tag, autori e articoli, importabili in qualsiasi WordPress. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || !can(me, 'settings.manage')) return new Response('Non autorizzato', { status: 401 });
  const [s, cats, users, tags] = await Promise.all([getSettings(), getCategories(), getUsers(), listTags(100000)]);
  const base = siteUrl(); const enc = new TextEncoder();
  const tagName = new Map(tags.map((t) => [t.id, t]));
  const head = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:wp="http://wordpress.org/export/1.2/">
<channel>
<title>${esc(s.siteName)}</title><link>${base}</link><description>${esc(s.description)}</description><language>it-IT</language>
<wp:wxr_version>1.2</wp:wxr_version><wp:base_site_url>${base}</wp:base_site_url><wp:base_blog_url>${base}</wp:base_blog_url>
${users.map((u, i) => `<wp:author><wp:author_id>${i + 1}</wp:author_id><wp:author_login>${cdata(u.email.split('@')[0])}</wp:author_login><wp:author_email>${cdata(u.email)}</wp:author_email><wp:author_display_name>${cdata(u.name)}</wp:author_display_name></wp:author>`).join('\n')}
${cats.map((c, i) => `<wp:category><wp:term_id>${i + 1}</wp:term_id><wp:category_nicename>${cdata(c.slug)}</wp:category_nicename><wp:cat_name>${cdata(c.name)}</wp:cat_name></wp:category>`).join('\n')}
${tags.slice(0, 5000).map((t, i) => `<wp:tag><wp:term_id>${1000 + i}</wp:term_id><wp:tag_slug>${cdata(t.slug)}</wp:tag_slug><wp:tag_name>${cdata(t.name)}</wp:tag_name></wp:tag>`).join('\n')}
`;
  const stream = new ReadableStream({
    async start(ctrl) {
      ctrl.enqueue(enc.encode(head));
      let offset = 0; let n = 1;
      for (;;) {
        const batch = await listArticles({ includeDeleted: false }, 'created', 200, offset); if (!batch.length) break; offset += batch.length;
        for (const a of batch) {
          const cat = cats.find((c) => c.id === a.categoryId); const author = users.find((u) => u.id === a.authorId);
          const status = a.status === 'published' ? 'publish' : a.status === 'scheduled' ? 'future' : a.status === 'review' ? 'pending' : a.status === 'archived' ? 'private' : 'draft';
          const item = `<item>
<title>${cdata(a.title)}</title><link>${base}/${cat?.slug ?? 'notizie'}/${a.slug}</link><pubDate>${a.publishedAt ? new Date(a.publishedAt).toUTCString() : ''}</pubDate>
<dc:creator>${cdata(author?.email.split('@')[0] ?? 'redazione')}</dc:creator><guid isPermaLink="false">${base}/?p=${n}</guid>
<description></description><content:encoded>${cdata((a.coverImage ? `<figure><img src="${a.coverImage}" alt="${esc(a.title)}" />${a.coverCaption ? `<figcaption>${esc(a.coverCaption)}</figcaption>` : ''}</figure>\n` : '') + a.content)}</content:encoded><excerpt:encoded>${cdata(a.excerpt)}</excerpt:encoded>
<wp:post_id>${n}</wp:post_id><wp:post_date>${wpDate(a.publishedAt ?? a.createdAt)}</wp:post_date><wp:post_date_gmt>${wpDate(a.publishedAt ?? a.createdAt)}</wp:post_date_gmt><wp:post_modified>${wpDate(a.updatedAt)}</wp:post_modified>
<wp:comment_status>${a.allowComments ? 'open' : 'closed'}</wp:comment_status><wp:post_name>${cdata(a.slug)}</wp:post_name><wp:status>${status}</wp:status><wp:post_type>post</wp:post_type><wp:post_parent>0</wp:post_parent><wp:menu_order>0</wp:menu_order>
${cat ? `<category domain="category" nicename="${esc(cat.slug)}">${cdata(cat.name)}</category>` : ''}
${a.tagIds.map((t) => tagName.get(t)).filter(Boolean).map((t) => `<category domain="post_tag" nicename="${esc(t!.slug)}">${cdata(t!.name)}</category>`).join('')}
<wp:postmeta><wp:meta_key>_aster_id</wp:meta_key><wp:meta_value>${cdata(a.id)}</wp:meta_value></wp:postmeta>${a.kicker ? `<wp:postmeta><wp:meta_key>kicker</wp:meta_key><wp:meta_value>${cdata(a.kicker)}</wp:meta_value></wp:postmeta>` : ''}${a.seo.description ? `<wp:postmeta><wp:meta_key>_yoast_wpseo_metadesc</wp:meta_key><wp:meta_value>${cdata(a.seo.description)}</wp:meta_value></wp:postmeta>` : ''}
</item>
`;
          ctrl.enqueue(enc.encode(item)); n++;
        }
        if (batch.length < 200) break;
      }
      ctrl.enqueue(enc.encode('</channel>\n</rss>\n')); ctrl.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Content-Disposition': `attachment; filename="aster-news-wxr-${new Date().toISOString().slice(0, 10)}.xml"`, 'Cache-Control': 'no-store' } });
}
