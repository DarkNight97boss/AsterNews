import { zipStore } from './zip';

/** Libro dal blog: EPUB 3 valido (mimetype non compresso per primo) e versione HTML impaginata per la stampa in PDF. */
export interface Chapter { title: string; date: string; html: string }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
/** XHTML rigoroso: via script, iframe, attributi di evento; tag vuoti chiusi; entità HTML non XML convertite. */
export function toXhtml(html: string): string {
  return html.replace(/<(script|style|iframe|form|video|audio|object)[\s\S]*?<\/\1>/gi, '').replace(/<(script|iframe|input|button|source)[^>]*\/?>/gi, '').replace(/\s(on\w+|style|class|data-[\w-]+|loading|decoding|srcset|sizes)="[^"]*"/gi, '')
    .replace(/<img[^>]*>/gi, '').replace(/<(br|hr)\s*\/?>/gi, '<$1/>').replace(/&nbsp;/g, '&#160;').replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, '&amp;').replace(/\{\{dato:[^}]+\}\}/g, '').replace(/\[\[nota:[\s\S]*?\]\]/g, '');
}
export function buildEpub(meta: { title: string; author: string; lang?: string; id: string; date: string }, chapters: Chapter[]): Uint8Array {
  const lang = meta.lang ?? 'it'; const file = (i: number) => `c${String(i + 1).padStart(3, '0')}.xhtml`;
  const page = (title: string, body: string) => `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}"><head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`;
  const nav = page('Indice', `<nav epub:type="toc" id="toc"><h1>Indice</h1><ol>${chapters.map((c, i) => `<li><a href="${file(i)}">${esc(c.title)}</a></li>`).join('')}</ol></nav>`);
  const opf = `<?xml version="1.0" encoding="utf-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="uid">${esc(meta.id)}</dc:identifier><dc:title>${esc(meta.title)}</dc:title><dc:creator>${esc(meta.author)}</dc:creator><dc:language>${lang}</dc:language><meta property="dcterms:modified">${meta.date.slice(0, 19)}Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>${chapters.map((_, i) => `<item id="c${i + 1}" href="${file(i)}" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine><itemref idref="title"/><itemref idref="nav"/>${chapters.map((_, i) => `<itemref idref="c${i + 1}"/>`).join('')}</spine></package>`;
  return zipStore([
    { name: 'mimetype', data: 'application/epub+zip' },
    { name: 'META-INF/container.xml', data: '<?xml version="1.0"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>' },
    { name: 'OEBPS/content.opf', data: opf }, { name: 'OEBPS/nav.xhtml', data: nav }, { name: 'OEBPS/style.css', data: 'body{font-family:Georgia,serif;line-height:1.6;margin:1em}h1{font-size:1.6em;line-height:1.2}.date{color:#666;font-size:.85em}blockquote{border-left:3px solid #999;margin-left:0;padding-left:1em}' },
    { name: 'OEBPS/title.xhtml', data: page(meta.title, `<h1>${esc(meta.title)}</h1><p>${esc(meta.author)}</p><p class="date">${chapters.length} capitoli</p>`) },
    ...chapters.map((c, i) => ({ name: `OEBPS/${file(i)}`, data: page(c.title, `<h1>${esc(c.title)}</h1><p class="date">${esc(c.date)}</p>${toXhtml(c.html)}`) })),
  ]);
}
export function buildPrintHtml(meta: { title: string; author: string }, chapters: Chapter[]): string {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(meta.title)}</title><meta name="robots" content="noindex"><style>@page{size:A5;margin:18mm 16mm}body{font-family:Georgia,serif;line-height:1.6;max-width:36em;margin:2em auto;padding:0 1em;color:#111}h1{font-size:1.7em;line-height:1.2;page-break-before:always}.cover h1{page-break-before:avoid;font-size:2.4em;margin-top:30vh}.date{color:#666;font-size:.85em}img{max-width:100%;height:auto}nav ol{padding-left:1.2em}nav a{color:inherit;text-decoration:none}.hint{background:#fff7e8;padding:10px 14px;font-family:sans-serif;font-size:13px}@media print{.hint{display:none}}</style></head><body><p class="hint">Per ottenere il PDF: Stampa → Salva come PDF. Il formato è già impostato su A5.</p><section class="cover"><h1>${esc(meta.title)}</h1><p>${esc(meta.author)}</p></section><nav><h1>Indice</h1><ol>${chapters.map((c, i) => `<li><a href="#c${i + 1}">${esc(c.title)}</a></li>`).join('')}</ol></nav>${chapters.map((c, i) => `<article id="c${i + 1}"><h1>${esc(c.title)}</h1><p class="date">${esc(c.date)}</p>${c.html.replace(/<(script|iframe)[\s\S]*?<\/\1>/gi, '')}</article>`).join('')}</body></html>`;
}
