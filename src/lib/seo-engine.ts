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
export interface SeoSettings { languages?: string; gscServiceAccount?: string; gscSiteUrl?: string; autoOptimizeOnSave: boolean; autoInternalLinks: boolean; maxInternalLinks: number; fixImages: boolean; searchConsoleToken: string; titleSuffix: boolean }
export const DEFAULT_SEO_SETTINGS: SeoSettings = { autoOptimizeOnSave: true, autoInternalLinks: true, maxInternalLinks: 4, fixImages: true, searchConsoleToken: '', titleSuffix: true };

const STOP = new Set(('a ad al alla alle allo agli ai anche ancora avere aveva avevano ben c che chi ci come con contro cui da dal dalla dalle dallo dagli dai de dei del della delle dello degli di dopo dove due e ed egli era erano essere fa fare fino fra gli ha hanno il in invece io l la le lei li lo loro lui ma me mi mio molto ne nei nel nella nelle nello negli noi non nostro o ogni oltre ora per perché più poco poi prima quale quando quanto quasi quella quelle quelli quello questa queste questi questo qui se sei senza si sia siamo solo sono sopra sotto sua sue sui sul sulla sulle sullo sugli suo suoi tra tre tu tua tue tuo tutti tutto un una uno va verso vi voi è così già stato stata stati state come cosa oggi ieri domani anni anno euro ore ora nuovo nuova nuovi nuove grande grandi primo prima secondo dopo tutto tutta italia italiana italiano caso via prossime prossimo prossima prossimi reazioni notizia notizie redazione secondo punto parte fonti aggiornamenti pagina articolo articoli vicenda situazione'.split(' ')));

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function words(text: string): string[] {
  return norm(text).replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

/** Frasi/incisi come sequenze di token; le stopword restano (marcate) per non formare bigrammi che le scavalcano. */
const CONNECTIVES = new Set(['di', 'del', 'della', 'dei', 'delle', 'dello', 'degli', 'a', 'al', 'alla', 'ai', 'alle', 'allo', 'agli', 'da', 'dal', 'dalla', 'dai', 'dalle', 'in', 'nel', 'nella', 'nei', 'nelle', 'per', 'e', 'su', 'sul', 'sulla', 'sui', 'sulle']);
function chunks(text: string): { w: string; stop: boolean }[][] {
  return norm(text).split(/[.,;:!?()«»"“”\[\]\n]+/).map((c) => c.replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !/^\d+$/.test(w)).map((w) => ({ w, stop: STOP.has(w) || w.length < 3 }))).filter((c) => c.length);
}
/** Frasi chiave di un inciso: bigrammi adiacenti e "parola + connettivo + parola" (es. consiglio dei ministri). */
function phrasesOf(c: { w: string; stop: boolean }[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < c.length; i++) {
    if (c[i].stop) continue;
    const n1 = c[i + 1], n2 = c[i + 2];
    if (n1 && !n1.stop) out.push(`${c[i].w} ${n1.w}`);
    else if (n1 && n2 && CONNECTIVES.has(n1.w) && !n2.stop) out.push(`${c[i].w} ${n1.w} ${n2.w}`);
  }
  return out;
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
  const titlePhrases = new Set(chunks(title).flatMap(phrasesOf));
  const score = new Map<string, number>();
  const add = (k: string, v: number) => score.set(k, (score.get(k) ?? 0) + v);
  chunks(stripHtml(content)).forEach((c) => {
    c.forEach((t) => { if (!t.stop) add(t.w, 1 + (head.has(t.w) ? 3 : 0)); });
    phrasesOf(c).forEach((ph) => { const parts = ph.split(' ').filter((x) => !CONNECTIVES.has(x)); add(ph, 1.5 + (titlePhrases.has(ph) ? 6 : parts.every((x) => head.has(x)) ? 3 : 0)); });
  });
  words(title).forEach((w) => add(w, 2));
  titlePhrases.forEach((ph) => add(ph, 2.5));
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
    if (cap) run.push(t); else { if (run.length >= 2 && run.join(' ').length >= 8) proper.push(run.join(' ')); run = []; }
  });
  if (run.length >= 2 && run.join(' ').length >= 8) proper.push(run.join(' '));
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
  const siteTokens = words(ctx.siteName);
  const keywords = extractKeywords(a.title, a.kicker, a.content, 12).filter((k) => !siteTokens.some((t) => k.split(' ').includes(t))).slice(0, 8);
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

/* ==========================================================
   Pipeline "articolo grezzo → articolo ottimizzato"
   ========================================================== */
export interface CategoryProfile { id: string; name: string; kind: string; terms: string[] }
export interface ZoneRef { id: string; name: string }
export interface MediaRef { url: string; name: string; alt: string }
export interface RawContext extends SeoContext {
  categories: CategoryProfile[];
  zones: ZoneRef[];
  media: MediaRef[];
  relatedCovers: { url: string; title: string; terms: string[] }[];
}
export interface RawInput { title: string; text: string; coverImage?: string; categoryId?: string }
export interface PreparedArticle {
  title: string; kicker: string; subtitle: string; excerpt: string; content: string; slug: string;
  categoryId: string; zoneId: string; tagNames: string[]; coverImage: string; coverCaption: string;
  seo: { title: string; description: string; canonical: string; noIndex: boolean; focusKeyword: string };
  report: string[]; addedLinks: { url: string; title: string; anchor: string }[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const capWords = (s: string) => s.split(' ').map((w) => (CONNECTIVES.has(w) ? w : capFirst(w))).join(' ');

function splitSentences(text: string): string[] {
  return text.match(/[^.!?…]+[.!?…]+["»”]?|[^.!?…]+$/g)?.map((x) => x.trim()).filter(Boolean) ?? [text];
}

/** Testo libero (o HTML incollato) → paragrafi puliti. Le righe brevi senza punto finale diventano titoletti. */
export function normalizeRawText(raw: string): { blocks: { type: 'p' | 'h2'; text: string }[]; headingsFound: number; splitParagraphs: number } {
  let text = raw;
  if (/<[a-z][\s\S]*>/i.test(text)) {
    text = text.replace(/<\/(p|div|h[1-6]|li|br)\s*>|<br\s*\/?>/gi, '\n\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  }
  const lines = text.replace(/\r/g, '').split(/\n{2,}|\n(?=\s*[-•*]\s)/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const blocks: { type: 'p' | 'h2'; text: string }[] = [];
  let headingsFound = 0, splitParagraphs = 0;
  lines.forEach((line, i) => {
    const single = line.split('\n').length === 1;
    const isHeading = single && line.length <= 70 && !/[.!?…:]$/.test(line) && line.split(' ').length <= 10 && i > 0 && i < lines.length - 1;
    if (isHeading) { blocks.push({ type: 'h2', text: line.replace(/^#+\s*/, '') }); headingsFound++; return; }
    const words = line.split(' ').length;
    if (words > 120) {
      const sents = splitSentences(line);
      let cur: string[] = []; let count = 0;
      sents.forEach((s) => { cur.push(s); count += s.split(' ').length; if (count >= 70) { blocks.push({ type: 'p', text: cur.join(' ') }); cur = []; count = 0; } });
      if (cur.length) blocks.push({ type: 'p', text: cur.join(' ') });
      splitParagraphs++;
    } else blocks.push({ type: 'p', text: line.replace(/^#+\s*/, '') });
  });
  return { blocks, headingsFound, splitParagraphs };
}

/** Inserisce titoletti ogni 3-4 paragrafi quando il testo non ne ha, usando la frase chiave del gruppo. */
export function addHeadings(blocks: { type: 'p' | 'h2'; text: string }[], focus: string): { blocks: { type: 'p' | 'h2'; text: string }[]; added: number } {
  const paragraphs = blocks.filter((b) => b.type === 'p').length;
  if (blocks.some((b) => b.type === 'h2') || paragraphs < 5) return { blocks, added: 0 };
  const out: { type: 'p' | 'h2'; text: string }[] = [];
  const used = new Set<string>([norm(focus)]);
  let group: string[] = []; let pIndex = 0; let added = 0;
  const flushHeading = (groupText: string) => {
    const kw = extractKeywords('', '', `<p>${groupText}</p>`, 6).find((k) => k.includes(' ') && !used.has(k)) ?? extractKeywords('', '', `<p>${groupText}</p>`, 6).find((k) => !used.has(k));
    if (!kw) return;
    used.add(kw);
    out.push({ type: 'h2', text: capWords(kw) });
    added++;
  };
  blocks.forEach((b) => {
    if (b.type === 'p') {
      pIndex++;
      if (pIndex > 2 && (pIndex - 3) % 3 === 0) { flushHeading(group.join(' ') || b.text); group = []; }
      group.push(b.text);
    }
    out.push(b);
  });
  return { blocks: out, added };
}

export function blocksToHtml(blocks: { type: 'p' | 'h2'; text: string }[]): string {
  return blocks.map((b) => (b.type === 'h2' ? `<h2>${esc(b.text)}</h2>` : `<p>${esc(b.text)}</p>`)).join('\n');
}

function guessCategory(text: string, title: string, cats: CategoryProfile[]): { id: string; confidence: number } | null {
  const usable = cats.filter((c) => c.kind === 'standard' || c.kind === 'local');
  if (!usable.length) return null;
  const toks = words(`${title} ${title} ${text}`);
  const freq = new Map<string, number>();
  toks.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));
  let best: { id: string; score: number } | null = null; let second = 0;
  for (const c of usable) {
    const nameToks = words(c.name);
    let s = 0;
    c.terms.forEach((t, i) => { const f = freq.get(t) ?? 0; if (f) s += f * (1 + (c.terms.length - i) / c.terms.length); });
    nameToks.forEach((t) => { s += (freq.get(t) ?? 0) * 6; });
    if (!best || s > best.score) { second = best?.score ?? 0; best = { id: c.id, score: s }; } else if (s > second) second = s;
  }
  if (!best || best.score === 0) return null;
  return { id: best.id, confidence: second ? Math.min(1, (best.score - second) / best.score) : 1 };
}

/** Costruisce un articolo completo e ottimizzato partendo da titolo e testo grezzo. */
export function prepareArticle(input: RawInput, ctx: RawContext, opts: { maxLinks: number; siteUrl: string }): PreparedArticle {
  const report: string[] = [];
  const norm1 = normalizeRawText(input.text);
  let blocks = norm1.blocks;
  if (norm1.splitParagraphs) report.push(`${norm1.splitParagraphs} paragrafi troppo lunghi spezzati in blocchi leggibili`);
  if (norm1.headingsFound) report.push(`${norm1.headingsFound} righe brevi riconosciute come titoletti (H2)`);

  // Titolo: dal campo, oppure dalla prima frase.
  let title = input.title.trim();
  if (!title) {
    const first = blocks.find((b) => b.type === 'p')?.text ?? 'Articolo';
    title = cut(splitSentences(first)[0].replace(/[.!?…]+$/, ''), 80);
    report.push('titolo ricavato dalla prima frase (da verificare)');
  } else if (title.length > 95) { report.push('titolo molto lungo: valuta di accorciarlo'); }

  const plain = blocks.map((b) => b.text).join('\n');
  const html0 = blocksToHtml(blocks);
  const kws = extractKeywords(title, '', html0, 12).filter((k) => !words(ctx.siteName).some((t) => k.split(' ').includes(t)));
  const focus = kws.find((k) => k.includes(' ') && norm(title).includes(k)) ?? kws.find((k) => norm(title).includes(k)) ?? kws[0] ?? '';
  if (focus) report.push(`parola chiave scelta: «${focus}»`);

  const h = addHeadings(blocks, focus);
  blocks = h.blocks;
  if (h.added) report.push(`${h.added} titoletti H2 aggiunti per strutturare il testo`);

  // Sommario ed estratto: seconda frase o primo paragrafo successivo al titolo.
  const firstP = blocks.find((b) => b.type === 'p')?.text ?? '';
  const sents = splitSentences(firstP);
  const subtitle = cut((sents[1] && sents[1].length > 40 ? sents[1] : sents[0]) ?? title, 160);
  report.push('sommario ed estratto generati dal primo paragrafo');

  // Categoria e zona.
  const lower0 = norm(`${title} ${plain}`);
  const zone0 = ctx.zones.find((z) => new RegExp(`(^|[^\\p{L}])${escapeRe(norm(z.name))}(?=$|[^\\p{L}])`, 'u').test(lower0));
  let categoryId = input.categoryId ?? '';
  if (!categoryId) {
    const g = guessCategory(plain, title, ctx.categories);
    const local = ctx.categories.find((c) => c.kind === 'local');
    if (zone0 && local && (!g || g.confidence < 0.5)) { categoryId = local.id; report.push(`categoria assegnata: ${local.name} (zona riconosciuta)`); }
    else categoryId = g?.id ?? ctx.categories.find((c) => c.kind === 'standard')?.id ?? ctx.categories[0]?.id ?? '';
    const cName = ctx.categories.find((c) => c.id === categoryId)?.name ?? '';
    if (!(zone0 && local && (!g || g.confidence < 0.5))) report.push(g ? `categoria assegnata: ${cName}${g.confidence < 0.3 ? ' (incerta, verifica)' : ''}` : `categoria predefinita: ${cName}`);
  }
  const lower = norm(`${title} ${plain}`);
  const zone = ctx.zones.find((z) => new RegExp(`(^|[^\\p{L}])${escapeRe(norm(z.name))}(?=$|[^\\p{L}])`, 'u').test(lower));
  const zoneId = zone?.id ?? '';
  if (zone) report.push(`zona riconosciuta: ${zone.name}`);

  // Occhiello: parola singola più forte del titolo, oppure la zona/categoria.
  const kickerWord = kws.find((k) => !k.includes(' ') && norm(title).includes(k));
  const kicker = zone && ctx.categories.find((c) => c.id === categoryId)?.kind === 'local' ? zone.name : kickerWord ? capFirst(kickerWord) : (ctx.categories.find((c) => c.id === categoryId)?.name ?? '');
  report.push(`occhiello: «${kicker}»`);

  // Tag: esistenti trovati nel testo + fino a 2 nuovi dalle frasi chiave del titolo.
  const tagNames = ctx.tags.filter((t) => new RegExp(`(^|[^\\p{L}])${escapeRe(norm(t.name))}(?=$|[^\\p{L}])`, 'u').test(lower)).slice(0, 5).map((t) => t.name);
  kws.filter((k) => k.includes(' ') && norm(title).includes(k) && !tagNames.some((t) => norm(t) === k)).slice(0, 2).forEach((k) => tagNames.push(capWords(k)));
  if (tagNames.length) report.push(`tag: ${tagNames.join(', ')}`);

  // Copertina.
  let coverImage = input.coverImage ?? '';
  let coverCaption = '';
  if (!coverImage) {
    const kwTokens = new Set(kws.flatMap((k) => k.split(' ')));
    const m = ctx.media.find((x) => words(`${x.name} ${x.alt}`).some((t) => kwTokens.has(t)));
    if (m) { coverImage = m.url; coverCaption = m.alt || 'Foto di archivio'; report.push('copertina scelta dalla libreria media (verifica)'); }
    else {
      const rel = ctx.relatedCovers.map((r) => ({ r, s: r.terms.filter((t) => kwTokens.has(t)).length })).sort((a, b) => b.s - a.s)[0];
      if (rel && rel.s > 0) { coverImage = rel.r.url; coverCaption = 'Foto di archivio'; report.push('copertina provvisoria presa da un articolo correlato: sostituiscila'); }
      else report.push('copertina mancante: aggiungila prima di pubblicare');
    }
  }

  // Meta, slug e link interni.
  let content = fixHtml(blocksToHtml(blocks), title, opts.siteUrl);
  const linked = autoLinkContent(content, ctx.linkTargets, opts.maxLinks);
  content = linked.html;
  if (linked.added.length) report.push(`${linked.added.length} link interni inseriti (${linked.added.map((l) => `«${l.anchor}»`).join(', ')})`);
  const seo = { title: suggestMetaTitle(title), description: cut(subtitle, 156), canonical: '', noIndex: false, focusKeyword: focus };
  const slug = suggestSlug(title, focus);
  report.push('meta title, meta description e slug compilati');

  return { title, kicker, subtitle, excerpt: subtitle, content, slug, categoryId, zoneId, tagNames, coverImage, coverCaption, seo, report, addedLinks: linked.added };
}

/** Ristruttura un contenuto HTML esistente: paragrafi lunghi spezzati e titoletti se mancano. Mantiene link e grassetti solo se non spezza. */
export function restructureHtml(html: string, focus: string): { html: string; report: string[] } {
  const report: string[] = [];
  const hasHeadings = /<h[23][\s>]/i.test(html);
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  const tooLong = paragraphs.some((p) => stripHtml(p).split(/\s+/).length > 120);
  if (hasHeadings && !tooLong) return { html, report };
  const n = normalizeRawText(html);
  let blocks = n.blocks;
  if (n.splitParagraphs) report.push(`${n.splitParagraphs} paragrafi spezzati`);
  const h = addHeadings(blocks, focus);
  blocks = h.blocks;
  if (h.added) report.push(`${h.added} titoletti aggiunti`);
  if (!report.length) return { html, report };
  report.push('formattazione inline (grassetti, link) rimossa durante la ristrutturazione');
  return { html: blocksToHtml(blocks), report };
}
