import 'server-only';
import * as x3 from './repo-extra3';
import { renderAuthorNotes, renderLiveData, type LiveDatum } from './writing';

/**
 * Rifiniture del contenuto al momento del rendering (il testo salvato non cambia):
 * - blocchi riutilizzabili: <div data-snippet="id"> → contenuto aggiornato del blocco;
 * - note a piè di pagina: [^testo] nel testo → richiamo numerato e elenco finale;
 * - id sui titoli H2/H3 per l'indice dei paragrafi.
 */
export async function enhanceContent(html: string): Promise<string> {
  let out = html;
  if (out.includes('data-snippet=')) {
    const ids = [...new Set([...out.matchAll(/data-snippet="([^"]+)"/g)].map((m) => m[1]))];
    const snippets = await Promise.all(ids.map((id) => x3.findSnippet(id)));
    out = out.replace(/<div[^>]*data-snippet="([^"]+)"[^>]*>[\s\S]*?<\/div>/g, (_, id) => { const s = snippets.find((sn) => sn?.id === id); return s ? `<div class="snippet" data-snippet="${id}">${s.html}</div>` : ''; });
  }
  // numeri collegati alla fonte: {{dato:chiave}} → valore corrente; annotazioni dell'autore [[nota: …]]
  if (out.includes('{{dato:')) { const { listRecords } = await import('./records'); out = renderLiveData(out, (await listRecords<LiveDatum>('datum', { limit: 500 })).map((r) => r.data)); }
  out = renderAuthorNotes(out);
  out = renderFootnotes(out);
  out = addHeadingIds(out);
  return out;
}
export function renderFootnotes(html: string): string {
  if (!html.includes('[^')) return html;
  const notes: string[] = [];
  const body = html.replace(/\[\^((?:[^\]\[]|\[[^\]]*\])+)\]/g, (_, text: string) => { notes.push(text.trim()); const n = notes.length; return `<sup class="fn"><a href="#fn-${n}" id="fnref-${n}" aria-label="Nota ${n}">${n}</a></sup>`; });
  if (!notes.length) return html;
  return `${body}\n<ol class="footnotes" aria-label="Note">${notes.map((t, i) => `<li id="fn-${i + 1}">${t} <a href="#fnref-${i + 1}" aria-label="Torna al testo">↩</a></li>`).join('')}</ol>`;
}
export const slugId = (s: string): string => s.toLowerCase().replace(/<[^>]+>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'sezione';
export function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(/<(h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (m, tag: string, attrs: string | undefined, inner: string) => { if (attrs && /\sid=/.test(attrs)) return m; let id = slugId(inner); const n = seen.get(id) ?? 0; seen.set(id, n + 1); if (n) id += '-' + (n + 1); return `<${tag}${attrs ?? ''} id="${id}">${inner}</${tag}>`; });
}
/** Indice dei paragrafi (solo H2) per i longform. */
export function buildToc(html: string): { id: string; text: string }[] {
  const seen = new Map<string, number>(); const out: { id: string; text: string }[] = [];
  for (const m of html.matchAll(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi)) { const text = m[2].replace(/<[^>]+>/g, '').trim(); if (!text) continue; const idAttr = m[1]?.match(/\sid="([^"]+)"/)?.[1]; let id = idAttr ?? slugId(text); if (!idAttr) { const n = seen.get(id) ?? 0; seen.set(id, n + 1); if (n) id += '-' + (n + 1); } out.push({ id, text }); }
  return out;
}
export const wordCount = (html: string): number => html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
