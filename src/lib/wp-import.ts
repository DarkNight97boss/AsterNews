import 'server-only';

/** Importazione da WordPress: file di esportazione WXR oppure REST API pubblica. */
export interface WpPost { wpId: string; title: string; slug: string; link: string; date: string; status: 'publish' | 'draft' | 'pending' | 'private' | 'future' | 'other'; author: string; content: string; excerpt: string; categories: string[]; tags: string[]; image: string; type: string }

const unCdata = (s: string) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#8217;/g, '’').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&nbsp;/g, ' ');
const tagOf = (block: string, name: string): string => { const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`)); return m ? decode(unCdata(m[1]).trim()) : ''; };

/** Pulisce il contenuto WordPress: commenti dei blocchi Gutenberg, shortcode, attributi inutili. */
export function cleanWpContent(html: string): string {
  let h = html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '');
  h = h.replace(/\[caption[^\]]*\]([\s\S]*?)\[\/caption\]/g, (m, inner: string) => { const img = inner.match(/<img[^>]*>/i)?.[0] ?? ''; const cap = inner.replace(/<img[^>]*>/i, '').replace(/<[^>]+>/g, '').trim(); return img ? `<figure>${img}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>` : inner; });
  h = h.replace(/\[\/?[a-zA-Z_][^\]]*\]/g, '');
  h = h.replace(/\s(class|id|style|srcset|sizes|data-[a-z-]+)="[^"]*"/g, '');
  h = h.replace(/<(div|span)[^>]*>/g, '').replace(/<\/(div|span)>/g, '');
  if (!/<p[\s>]/i.test(h)) h = h.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
  return h.trim();
}

export function parseWxr(xml: string): WpPost[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const attachments = new Map<string, string>();
  const posts: WpPost[] = [];
  for (const it of items) {
    const type = tagOf(it, 'wp:post_type');
    if (type === 'attachment') { attachments.set(tagOf(it, 'wp:post_id'), tagOf(it, 'wp:attachment_url')); continue; }
    if (type !== 'post') continue;
    const cats: string[] = []; const tags: string[] = [];
    for (const m of it.matchAll(/<category domain="(category|post_tag)"[^>]*>([\s\S]*?)<\/category>/g)) (m[1] === 'category' ? cats : tags).push(decode(unCdata(m[2]).trim()));
    const thumb = it.match(/<wp:meta_key><!\[CDATA\[_thumbnail_id\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[(\d+)\]\]>/)?.[1] ?? it.match(/<wp:meta_key>_thumbnail_id<\/wp:meta_key>\s*<wp:meta_value>(\d+)<\/wp:meta_value>/)?.[1];
    const statusRaw = tagOf(it, 'wp:status');
    posts.push({
      wpId: tagOf(it, 'wp:post_id'), title: tagOf(it, 'title'), slug: tagOf(it, 'wp:post_name'), link: tagOf(it, 'link'), date: (tagOf(it, 'wp:post_date_gmt') || tagOf(it, 'wp:post_date')).replace(' ', 'T'),
      status: (['publish', 'draft', 'pending', 'private', 'future'].includes(statusRaw) ? statusRaw : 'other') as WpPost['status'],
      author: tagOf(it, 'dc:creator'), content: cleanWpContent(tagOf(it, 'content:encoded')), excerpt: tagOf(it, 'excerpt:encoded').replace(/<[^>]+>/g, '').trim(), categories: cats, tags, image: thumb ? attachments.get(thumb) ?? '' : '', type,
    });
  }
  // Fallback: prima immagine nel contenuto se manca la featured.
  posts.forEach((p) => { if (!p.image) p.image = p.content.match(/<img[^>]*src="([^"]+)"/i)?.[1] ?? ''; });
  return posts;
}

export async function fetchWpRest(baseUrl: string, maxPosts = 200): Promise<WpPost[]> {
  const base = baseUrl.replace(/\/+$/, '');
  const out: WpPost[] = [];
  for (let page = 1; out.length < maxPosts && page <= 50; page++) {
    const res = await fetch(`${base}/wp-json/wp/v2/posts?_embed=1&per_page=50&page=${page}&status=publish`, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'ASTER-News-Importer/1.0' } });
    if (!res.ok) { if (page === 1) throw new Error(`Il sito non espone l'API REST di WordPress (HTTP ${res.status}).`); break; }
    const data = (await res.json()) as unknown[];
    if (!Array.isArray(data) || data.length === 0) break;
    for (const raw of data) {
      const p = raw as { id: number; title: { rendered: string }; slug: string; link: string; date_gmt: string; status: string; content: { rendered: string }; excerpt: { rendered: string }; _embedded?: { author?: { name: string }[]; 'wp:featuredmedia'?: { source_url?: string }[]; 'wp:term'?: { taxonomy: string; name: string }[][] } };
      const terms = (p._embedded?.['wp:term'] ?? []).flat();
      out.push({
        wpId: String(p.id), title: decode(p.title.rendered).replace(/<[^>]+>/g, ''), slug: p.slug, link: p.link, date: p.date_gmt, status: 'publish', author: p._embedded?.author?.[0]?.name ?? '',
        content: cleanWpContent(p.content.rendered), excerpt: decode(p.excerpt.rendered).replace(/<[^>]+>/g, '').replace(/\[&hellip;\]|\[…\]/g, '').trim(),
        categories: terms.filter((t) => t.taxonomy === 'category').map((t) => decode(t.name)), tags: terms.filter((t) => t.taxonomy === 'post_tag').map((t) => decode(t.name)),
        image: p._embedded?.['wp:featuredmedia']?.[0]?.source_url ?? p.content.rendered.match(/<img[^>]*src="([^"]+)"/i)?.[1] ?? '', type: 'post',
      });
      if (out.length >= maxPosts) break;
    }
    if (data.length < 50) break;
  }
  return out;
}
