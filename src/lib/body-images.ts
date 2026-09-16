import 'server-only';
import { all } from './db';
import { sizesFor } from './image-slots';

type Media = { url: string; width: number; height: number; variants: Record<string, string> };

/**
 * Ottimizza le immagini dentro l'HTML degli articoli e delle pagine, senza toccare il contenuto salvato:
 * - lazy loading e decodifica asincrona;
 * - `sizes="auto, …"` calibrato sulla colonna dell'articolo;
 * - per le foto della Libreria media: srcset con le varianti WebP già generate in upload e width/height
 *   (niente scatti di layout, niente byte sprecati).
 */
export async function optimizeBodyImages(html: string): Promise<string> {
  if (!html || !/<img\b/i.test(html)) return html;
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)];
  const srcs = [...new Set(tags.map((m) => attr(m[0], 'src')).filter((s): s is string => !!s && /^(https?:)?\/\//.test(s)))];
  const known = new Map<string, Media>();
  if (srcs.length) {
    try {
      const rows = (await all(`SELECT url, width, height, variants FROM media WHERE url IN (${srcs.map(() => '?').join(',')})`, srcs)) as Record<string, unknown>[];
      for (const r of rows) { let variants: Record<string, string> = {}; try { variants = typeof r.variants === 'string' ? JSON.parse(r.variants) : ((r.variants as Record<string, string>) ?? {}); } catch { /* ignora */ } known.set(String(r.url), { url: String(r.url), width: Number(r.width ?? 0), height: Number(r.height ?? 0), variants }); }
    } catch { /* la tabella potrebbe non avere ancora le colonne: si prosegue senza srcset */ }
  }
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, 'src'); if (!src || src.startsWith('data:')) return tag;
    let out = tag;
    if (!/\sloading=/i.test(out)) out = out.replace(/^<img/i, '<img loading="lazy"');
    if (!/\sdecoding=/i.test(out)) out = out.replace(/^<img/i, '<img decoding="async"');
    const m = known.get(src);
    if (m) {
      if (!/\ssrcset=/i.test(out)) {
        const set = Object.entries(m.variants).map(([w, u]) => `${u} ${w}w`);
        if (m.width) set.push(`${m.url} ${m.width}w`);
        if (set.length) out = out.replace(/^<img/i, `<img srcset="${set.join(', ')}" sizes="${sizesFor('body')}"`);
      }
      if (m.width && m.height && !/\swidth=/i.test(out)) out = out.replace(/^<img/i, `<img width="${m.width}" height="${m.height}"`);
    } else if (!/\ssizes=/i.test(out) && /\ssrcset=/i.test(out)) out = out.replace(/^<img/i, `<img sizes="${sizesFor('body')}"`);
    return out;
  });
}
function attr(tag: string, name: string): string | undefined { const m = tag.match(new RegExp(`\\s${name}=("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3]) : undefined; }
