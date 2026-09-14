/**
 * Motore SEO automatico: analisi, suggerimenti e ottimizzazione degli articoli.
 * Funzioni pure (usate sia nell'editor lato client sia nelle server action).
 */
import type { Article } from './models';
import { slugify, stripHtml } from './utils';

export interface SeoCheck { id: string; label: string; status: 'ok' | 'warn' | 'fail'; hint?: string; weight: number }
export interface LinkTarget { id: string; title: string; url: string; phrases: string[] }
export interface SeoContext { siteName: string; existingTitles: string[]; tags: { id: string; name: string }[]; linkTargets: LinkTarget[] }
export interface SeoAnalysis {
  score: number; checks: SeoCheck[]; focusKeyword: string; keywords: string[];
  suggestedTitle: string; suggestedDescription: string; suggestedSlug: string; suggestedTags: { id?: string; name: string }[];
  readability: number; words: number; internalLinks: number; externalLinks: number; headings: number; imagesWithoutAlt: number;
}
export interface SeoSettings { autoOptimizeOnSave: boolean; autoInternalLinks: boolean; maxInternalLinks: number; fixImages: boolean; searchConsoleToken: string; titleSuffix: boolean }
export const DEFAULT_SEO_SETTINGS: SeoSettings = { autoOptimizeOnSave: true, autoInternalLinks: true, maxInternalLinks: 4, fixImages: true, searchConsoleToken: '', titleSuffix: true };

const STOP = new Set(('a ad al alla alle allo agli ai anche ancora avere aveva avevano ben c che chi ci come con contro cui da dal dalla dalle dallo dagli dai de dei del della delle dello degli di dopo dove due e ed egli era erano essere fa fare fino fra gli ha hanno il in invece io l la le lei li lo loro lui ma me mi mio molto ne nei nel nella nelle nello negli noi non nostro o ogni oltre ora per perché più poco poi prima quale quando quanto quasi quella quelle quelli quello questa queste questi questo qui se sei senza si sia siamo solo sono sopra sotto sua sue sui sul sulla sulle sullo sugli suo suoi tra tre tu tua tue tuo tutti tutto un una uno va verso vi voi è così già stato stata stati state come cosa oggi ieri domani anni anno euro ore ora nuovo nuova nuovi nuove grande grandi primo prima secondo dopo tutto tutta italia italiana italiano governo caso via'.split(' ')));

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function words(text: string): string[] {
  return norm(text).replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

/** Come words(), ma i bigrammi non scavalcano la punteggiatura: restituisce gruppi di parole per frase/inciso. */
function chunks(text: string): string[][] {
  return norm(text).split(/[.,;:!?()«»"“”\[\]\n]+/).map((c) => c.replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w))).filter((c) => c.length);
}

function sentences(text: string): number {
  return Math.max(1, (text.match(/[.!?…]+(\s|$)/g) ?? []).length);
}

/** Indice Gulpease (leggibilità per l'italiano): >60 facile, 40-60 medio, <40 difficile. */
export function gulpease(text: string): number {
  const t = stripHtml(text);
  const w = t.split(/\s+/).filter(Boolean);
  if (w.length < 10) return 100;
  const letters = t.replace(/[^\p{L}]/gu, '').length;
  const g = 89 + (300 * sentences(t) - 10 * letters) / w.length;
  return Math.max(0, Math.min(100, Math.round(g)));
}

/** Parole chiave: unigrammi e bigrammi più frequenti nel testo, premiati se presenti nel titolo. */
export function extractKeywords(title: string, kicker: string, content: string, n = 8): string[] {
  const head = new Set(words(`${title} ${kicker}`));
  const titleBigrams = new Set(chunks(title).flatMap((c) => c.slice(0, -1).map((w, i) => `${w} ${c[i + 1]}`)));
  const score = new Map<string, number>();
  const add = (k: string, v: number) => score.set(k, (score.get(k) ?? 0) + v);
  chunks(stripHtml(content)).forEach((c) => c.forEach((w, i) => {
    add(w, 1 + (head.has(w) ? 3 : 0));
    const next = c[i + 1];
    if (next) { const bg = `${w} ${next}`; add(bg, 1.5 + (titleBigrams.has(bg) ? 6 : head.has(w) && head.has(next) ? 3 : 0)); }
  }));
  words(title).forEach((w) => add(w, 2));
  titleBigrams.forEach((bg) => add(bg, 2));
  return [...score.entries()].filter(([k, v]) => v >= 2 || k.includes(' ')).sort((a, b) => b[1] - a[1]).map(([k]) => k).filter((k, i, arr) => !arr.slice(0, i).some((p) => p.includes(k))).slice(0, n);
}

const cut = (s: string, max: number): string => {
  if (s.length <= max) return s;
  const t = s.slice(0, max - 1);
  const i = t.lastIndexOf(' ');
  return (i > max * 0.6 ? t.slice(0, i) : t).replace(/[,;:\s]+$/, '') + '…';
};

export function suggestMetaTitle(title: string): string { return cut(title.trim(), 62); }

export function suggestDescription(a: Pick<Article, 'excerpt' | 'subtitle' | 'content'>): string {
  const firstP = stripHtml((a.content.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? '')).trim();
  const base = (a.excerpt || a.subtitle || firstP).trim();
  return cut(base, 156);
}

export function suggestSlug(title: string, focus: string): string {
  const parts = slugify(title).split('-').filter((p) => p && !STOP.has(p));
  let slug = parts.join('-');
  if (focus && !slug.includes(slugify(focus))) slug = `${slugify(focus)}-${slug}`;
  if (slug.length > 70) slug = slug.slice(0, 70).replace(/-[^-]*$/, '');
  return slug || slugify(title).slice(0, 70);
}

/** Frasi-ancora con cui un articolo può essere linkato da altri: tag e nomi propri del titolo. */
export function phrasesForArticle(a: Pick<Article, 'title' | 'kicker'>, tagNames: string[]): string[] {
  const proper: string[] = [];
  const toks = a.title.replace(/[«»"“”:;,.!?()]/g, ' ').split(/\s+/).filter(Boolean);
  let run: string[] = [];
  toks.forEach((t, i) => {
    const cap = /^[A-ZÀ-Ý]/.test(t) && i > 0 && !STOP.has(norm(t));
    if (cap) run.push(t); else { if (run.join(' ').length >= 5) proper.push(run.join(' ')); run = []; }
  });
  if (run.join(' ').length >= 5) proper.push(run.join(' '));
  const kick = a.kicker && a.kicker.length >= 5 && !/^(bozza|revisione|programmato)$/i.test(a.kicker) ? [a.kicker] : [];
  return [...new Set([...tagNames, ...proper, ...kick])].filter((p) => p.length >= 4).slice(0, 6);
}

/** Inserisce link interni nei paragrafi: prima occorrenza di una frase-ancora di un altro articolo. */
export function autoLinkContent(html: string, targets: LinkTarget[], max = 4, existingUrls: string[] = []): { html: string; added: { url: string; title: string; anchor: string }[] } {
  if (!html || !targets.length || max <= 0) return { html, added: [] };
  const parts = html.split(/(<[^>]+>)/);
  const used = new Set<string>(existingUrls);
  const usedAnchors = new Set<string>([...html.matchAll(/class="auto-link"[^>]*>([^<]*)<\/a>/g)].map((m) => norm(m[1])));
  const added: { url: string; title: string; anchor: string }[] = [];
  let inA = 0, inH = 0, inFig = 0;
  const candidates = targets.filter((t) => !used.has(t.url));
  for (let i = 0; i < parts.length && added.length < max; i++) {
    const p = parts[i];
    if (p.startsWith('<')) {
      const tag = p.toLowerCase();
      if (/^<a[\s>]/.test(tag)) inA++; else if (tag.startsWith('</a')) inA = Math.max(0, inA - 1);
      else if (/^<h[1-6][\s>]/.test(tag)) inH++; else if (/^<\/h[1-6]/.test(tag)) inH = Math.max(0, inH - 1);
      else if (/^<(figure|figcaption|iframe|blockquote)[\s>]/.test(tag)) inFig++; else if (/^<\/(figure|figcaption|iframe|blockquote)/.test(tag)) inFig = Math.max(0, inFig - 1);
      continue;
    }
    if (inA || inH || inFig || !p.trim()) continue;
    let inserted = false;
    for (const t of candidates) {
      if (inserted || added.length >= max || used.has(t.url)) continue;
      for (const phrase of [...t.phrases].sort((x, y) => y.length - x.length)) {
        if (usedAnchors.has(norm(phrase))) continue;
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(phrase)})(?=$|[^\\p{L}\\p{N}])`, 'iu');
        const m = re.exec(p);
        if (!m) continue;
        const replaced = p.replace(re, `$1<a href="${t.url}" class="auto-link" title="${t.title.replace(/"/g, '&quot;')}">$2</a>`);
        // Rispezza il frammento: il tag appena inserito non deve essere scansionato per le frasi successive.
        const segs = replaced.split(/(<[^>]+>)/);
        parts.splice(i, 1, ...segs);
        used.add(t.url);
        usedAnchors.add(norm(phrase));
        added.push({ url: t.url, title: t.title, anchor: m[2] });
        inserted = true;
        break;
      }
    }
    if (inserted) i--; // riesamina il testo prima del link per gli altri bersagli
  }
  return { html: parts.join(''), added };
}

/** Rimuove i link inseriti automaticamente, lasciando il testo. */
export function stripAutoLinks(html: string): string {
  return html.replace(/<a\b[^>]*class="auto-link"[^>]*>([\s\S]*?)<\/a>/gi, '$1');
}

/** Alt mancanti sulle immagini + lazy loading; link esterni con rel/target. */
export function fixHtml(html: string, fallbackAlt: string, siteUrl: string): string {
  let out = html.replace(/<img\b([^>]*)>/gi, (m, attrs: string) => {
    let a = attrs;
    if (!/\balt=/.test(a)) a += ` alt="${fallbackAlt.replace(/"/g, '&quot;')}"`;
    else a = a.replace(/\balt=(""|'')/, `alt="${fallbackAlt.replace(/"/g, '&quot;')}"`);
    if (!/\bloading=/.test(a)) a += ' loading="lazy"';
    return `<img${a}>`;
  });
  out = out.replace(/<a\b([^>]*href="(https?:\/\/[^"]+)"[^>]*)>/gi, (m, attrs: string, href: string) => {
    if (siteUrl && href.startsWith(siteUrl)) return m;
    let a = attrs;
    if (!/\brel=/.test(a)) a += ' rel="noopener"';
    if (!/\btarget=/.test(a)) a += ' target="_blank"';
    return `<a${a}>`;
  });
  return out;
}

export function analyze(a: Article, ctx: SeoContext): SeoAnalysis {
  const text = stripHtml(a.content);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const keywords = extractKeywords(a.title, a.kicker, a.content);
  const focus = (a.seo.focusKeyword?.trim() || keywords.find((k) => k.includes(' ') && norm(a.title).includes(k)) || keywords[0] || '').toLowerCase();
  const metaTitle = a.seo.title || a.title;
  const metaDesc = a.seo.description || a.excerpt || a.subtitle;
  const slug = a.slug || slugify(a.title);
  const paragraphs = (a.content.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? []).map((p) => stripHtml(p)).filter(Boolean);
  const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).length > 130).length;
  const headings = (a.content.match(/<h[23][^>]*>/gi) ?? []).length;
  const imgs = a.content.match(/<img\b[^>]*>/gi) ?? [];
  const imagesWithoutAlt = imgs.filter((i) => !/\balt="[^"]+"/i.test(i)).length;
  const internalLinks = (a.content.match(/<a\b[^>]*href="(\/|https?:\/\/[^"]*\/)[^"]*"/gi) ?? []).filter((l) => !/https?:\/\//i.test(l) || l.includes('class="auto-link"')).length;
  const externalLinks = (a.content.match(/<a\b[^>]*href="https?:\/\//gi) ?? []).length;
  const readability = gulpease(a.content);
  const firstPara = norm(paragraphs[0] ?? '');
  const nf = norm(focus);
  const inTitle = !!nf && norm(a.title).includes(nf);
  const inFirst = !!nf && firstPara.includes(nf);
  const inHeading = !!nf && (a.content.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi) ?? []).some((h) => norm(stripHtml(h)).includes(nf));
  const inDesc = !!nf && norm(metaDesc).includes(nf);
  const inSlug = !!nf && slug.includes(slugify(focus));
  const duplicateTitle = ctx.existingTitles.some((t) => t && norm(t) === norm(a.title));
  const density = wordCount && nf ? (norm(text).split(nf).length - 1) / wordCount * 100 : 0;

  const checks: SeoCheck[] = [
    { id: 'title', label: 'Titolo tra 30 e 70 caratteri', status: a.title.length >= 30 && a.title.length <= 70 ? 'ok' : a.title.length > 0 ? 'warn' : 'fail', hint: `${a.title.length} caratteri`, weight: 8 },
    { id: 'metaTitle', label: 'Meta title tra 40 e 65 caratteri', status: metaTitle.length >= 40 && metaTitle.length <= 65 ? 'ok' : metaTitle.length ? 'warn' : 'fail', hint: `${metaTitle.length} caratteri`, weight: 6 },
    { id: 'metaDesc', label: 'Meta description tra 80 e 160 caratteri', status: metaDesc.length >= 80 && metaDesc.length <= 160 ? 'ok' : metaDesc.length ? 'warn' : 'fail', hint: `${metaDesc.length} caratteri`, weight: 8 },
    { id: 'slug', label: 'Slug breve (max 75) e leggibile', status: slug.length > 0 && slug.length <= 75 ? 'ok' : 'warn', hint: `${slug.length} caratteri`, weight: 4 },
    { id: 'focus', label: 'Parola chiave definita', status: focus ? 'ok' : 'fail', hint: focus ? `«${focus}»` : 'Scrivi il testo e imposta la parola chiave', weight: 6 },
    { id: 'kwTitle', label: 'Parola chiave nel titolo', status: inTitle ? 'ok' : 'warn', weight: 8 },
    { id: 'kwFirst', label: 'Parola chiave nel primo paragrafo', status: inFirst ? 'ok' : 'warn', weight: 6 },
    { id: 'kwHeading', label: 'Parola chiave in un sottotitolo (H2/H3)', status: inHeading ? 'ok' : 'warn', weight: 4 },
    { id: 'kwDesc', label: 'Parola chiave nella meta description', status: inDesc ? 'ok' : 'warn', weight: 5 },
    { id: 'kwSlug', label: 'Parola chiave nello slug', status: inSlug ? 'ok' : 'warn', weight: 4 },
    { id: 'density', label: 'Densità parola chiave tra 0,5% e 3%', status: !nf ? 'warn' : density >= 0.5 && density <= 3 ? 'ok' : 'warn', hint: `${density.toFixed(1)}%`, weight: 3 },
    { id: 'length', label: 'Testo di almeno 300 parole', status: wordCount >= 300 ? 'ok' : wordCount >= 150 ? 'warn' : 'fail', hint: `${wordCount} parole`, weight: 8 },
    { id: 'headings', label: 'Sottotitoli H2/H3 presenti', status: headings >= 2 ? 'ok' : headings === 1 ? 'warn' : 'fail', hint: `${headings} sottotitoli`, weight: 6 },
    { id: 'paragraphs', label: 'Paragrafi brevi (max 130 parole)', status: longParagraphs === 0 ? 'ok' : 'warn', hint: longParagraphs ? `${longParagraphs} paragrafi lunghi` : undefined, weight: 3 },
    { id: 'readability', label: 'Leggibilità (indice Gulpease ≥ 50)', status: readability >= 50 ? 'ok' : readability >= 40 ? 'warn' : 'fail', hint: `Gulpease ${readability}`, weight: 5 },
    { id: 'cover', label: 'Immagine di copertina', status: a.coverImage ? 'ok' : 'fail', weight: 6 },
    { id: 'caption', label: 'Didascalia / credit della copertina', status: a.coverCaption ? 'ok' : 'warn', weight: 2 },
    { id: 'alt', label: 'Testo alternativo sulle immagini nel testo', status: imagesWithoutAlt === 0 ? 'ok' : 'warn', hint: imagesWithoutAlt ? `${imagesWithoutAlt} senza alt` : undefined, weight: 3 },
    { id: 'internal', label: 'Almeno 2 link interni', status: internalLinks >= 2 ? 'ok' : internalLinks === 1 ? 'warn' : 'fail', hint: `${internalLinks} link interni`, weight: 8 },
    { id: 'external', label: 'Almeno 1 fonte esterna linkata', status: externalLinks >= 1 ? 'ok' : 'warn', hint: `${externalLinks} link esterni`, weight: 2 },
    { id: 'tags', label: 'Almeno 2 tag', status: a.tagIds.length >= 2 ? 'ok' : a.tagIds.length === 1 ? 'warn' : 'fail', hint: `${a.tagIds.length} tag`, weight: 5 },
    { id: 'excerpt', label: 'Estratto compilato', status: a.excerpt ? 'ok' : 'warn', weight: 3 },
    { id: 'kicker', label: 'Occhiello compilato', status: a.kicker ? 'ok' : 'warn', weight: 2 },
    { id: 'dup', label: 'Titolo non duplicato', status: duplicateTitle ? 'fail' : 'ok', hint: duplicateTitle ? 'Esiste già un articolo con questo titolo' : undefined, weight: 5 },
    { id: 'noindex', label: 'Indicizzazione attiva', status: a.seo.noIndex ? 'warn' : 'ok', hint: a.seo.noIndex ? 'noindex impostato' : undefined, weight: 2 },
  ];
  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.status === 'ok' ? c.weight : c.status === 'warn' ? c.weight / 2 : 0), 0);

  const lowerText = norm(`${a.title} ${text}`);
  const suggestedTags: { id?: string; name: string }[] = ctx.tags
    .filter((t) => !a.tagIds.includes(t.id) && new RegExp(`(^|[^\\p{L}])${escapeRe(norm(t.name))}(?=$|[^\\p{L}])`, 'u').test(lowerText))
    .slice(0, 6).map((t) => ({ id: t.id, name: t.name }));
  keywords.filter((k) => k.includes(' ') && !ctx.tags.some((t) => norm(t.name) === k)).slice(0, 3).forEach((k) => suggestedTags.push({ name: k.replace(/\b\p{L}/gu, (c) => c.toUpperCase()) }));

  return {
    score: Math.round((got / total) * 100), checks, focusKeyword: focus, keywords,
    suggestedTitle: suggestMetaTitle(a.title), suggestedDescription: suggestDescription(a), suggestedSlug: suggestSlug(a.title, focus), suggestedTags: suggestedTags.slice(0, 8),
    readability, words: wordCount, internalLinks, externalLinks, headings, imagesWithoutAlt,
  };
}

export interface OptimizeOptions { fillMeta: boolean; links: boolean; maxLinks: number; fixImages: boolean; siteUrl: string; overwriteSlug: boolean }

/** Applica le ottimizzazioni automatiche: meta vuoti, slug, parola chiave, link interni, immagini. */
export function optimizeArticle(a: Article, ctx: SeoContext, opts: OptimizeOptions): { article: Article; added: { url: string; title: string; anchor: string }[]; changes: string[] } {
  const an = analyze(a, ctx);
  const changes: string[] = [];
  const out: Article = { ...a, seo: { ...a.seo } };
  if (opts.fillMeta) {
    if (!out.seo.focusKeyword && an.focusKeyword) { out.seo.focusKeyword = an.focusKeyword; changes.push('parola chiave'); }
    if (!out.seo.title || out.seo.title.length > 70) { out.seo.title = an.suggestedTitle; changes.push('meta title'); }
    if (!out.seo.description || out.seo.description.length > 165) { out.seo.description = an.suggestedDescription; changes.push('meta description'); }
    if (!out.excerpt) { out.excerpt = an.suggestedDescription; changes.push('estratto'); }
    if ((opts.overwriteSlug || !out.slug) && out.title) { const s = suggestSlug(out.title, out.seo.focusKeyword ?? ''); if (s !== out.slug) { out.slug = s; changes.push('slug'); } }
  }
  let html = out.content;
  if (opts.fixImages) { const fixed = fixHtml(html, out.title, opts.siteUrl); if (fixed !== html) { html = fixed; changes.push('immagini e link esterni'); } }
  let added: { url: string; title: string; anchor: string }[] = [];
  if (opts.links) {
    const existing = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const r = autoLinkContent(html, ctx.linkTargets, Math.max(0, opts.maxLinks - existing.filter((u) => u.startsWith('/')).length), existing);
    if (r.added.length) { html = r.html; added = r.added; changes.push(`${r.added.length} link interni`); }
  }
  out.content = html;
  return { article: out, added, changes };
}
