/**
 * Pulizia dell'HTML incollato da Word, Google Docs, Pages o dal web: toglie stili, classi, span e commenti
 * mantenendo titoli, elenchi, tabelle, grassetti, corsivi e link. Pura (nessun DOM): usabile anche nei test.
 */
const KEEP_BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'br']);
const KEEP_INLINE = new Set(['b', 'strong', 'i', 'em', 'a', 'u', 's', 'sup', 'sub']);

export function cleanPastedHtml(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?(o:p|xml|meta|link|style|script|head|title)[^>]*>[\s\S]*?(<\/\1>|$)/gi, (m) => (/<style|<script|<xml|<head/i.test(m) ? '' : m));
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  // Elenchi di Word: paragrafi "MsoListParagraph" → li
  s = s.replace(/<p[^>]*class="?MsoListParagraph[^>]*>([\s\S]*?)<\/p>/gi, (_, inner) => `<li>${inner.replace(/^[\s·•\-–]*(<span[^>]*>[^<]*<\/span>)?[\s·•\-–]*/i, '')}</li>`);
  s = s.replace(/(<li>[\s\S]*?<\/li>\s*)+/g, (m) => `<ul>${m}</ul>`).replace(/<\/ul>\s*<ul>/g, '');
  // Link non sicuri (javascript:, data:, senza href): resta solo il testo
  s = s.replace(/<a\b(?![^>]*href="(?:https?:|mailto:|\/))[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  // Tag: tieni solo quelli utili, senza attributi (tranne href)
  s = s.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (m, tag: string, attrs: string) => {
    const t = tag.toLowerCase(); const closing = m.startsWith('</');
    if (t === 'div' || t === 'section' || t === 'article') return closing ? '</p>' : '<p>';
    if (t === 'span' || t === 'font') return '';
    if (t === 'h1') return closing ? '</h2>' : '<h2>';
    if (t === 'h4') return closing ? '</h3>' : '<h3>';
    if (t === 'strong') return closing ? '</b>' : '<b>';
    if (t === 'em') return closing ? '</i>' : '<i>';
    if (t === 'img') { const src = attrs.match(/src="([^"]+)"/i)?.[1]; return src && /^https?:/.test(src) ? `<img src="${src}" alt="" />` : ''; }
    if (t === 'a') { if (closing) return '</a>'; const href = attrs.match(/href="([^"]+)"/i)?.[1] ?? ''; return /^(https?:|mailto:|\/)/.test(href) ? `<a href="${href}">` : ''; }
    if (KEEP_BLOCK.has(t) || KEEP_INLINE.has(t)) return closing ? `</${t}>` : t === 'br' ? '<br />' : `<${t}>`;
    return '';
  });
  s = s.replace(/&nbsp;/g, ' ').replace(/ /g, ' ').replace(/[ \t]+/g, ' ');
  s = s.replace(/<p>\s*<\/p>/g, '').replace(/<b>\s*<\/b>|<i>\s*<\/i>/g, '').replace(/<p>\s*(<(?:h2|h3|ul|ol|table|blockquote)>)/g, '$1').replace(/(<\/(?:h2|h3|ul|ol|table|blockquote)>)\s*<\/p>/g, '$1');
  s = s.replace(/<p>\s*<br \/>\s*<\/p>/g, '').replace(/\s*\n\s*/g, '\n').trim();
  return s;
}
/** Vero se l'HTML contiene elementi di blocco (quindi va spezzato in più blocchi dell'editor). */
export const hasBlockElements = (html: string): boolean => /<(p|h2|h3|ul|ol|table|blockquote)\b/i.test(html);
/** Testo semplice (multi-paragrafo) → HTML a paragrafi. */
export const textToParagraphs = (text: string): string => text.split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br />')}</p>`).join('\n');
