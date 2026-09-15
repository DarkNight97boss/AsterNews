import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as repo from './repo';
import { isServerless } from './db';
import { ImportJob } from './repo';
import { Article, ArticleStatus, Category, User } from './models';
import { WpPost, cleanWpContent, fetchWpRestPage, parseWxrItem } from './wp-import';
import { analyze, optimizeArticle } from './seo-engine';
import { seoContext, getSeoSettings, invalidateProfiles } from './queries';
import { slugify, uid } from './utils';
import type { WpImportOptions } from './actions';
import { siteUrl } from './site-url';

/**
 * Job di importazione in background: WXR letto in streaming (anche file da centinaia di MB),
 * REST API paginata, inserimenti a lotti in transazione, avanzamento in tabella, ripresa idempotente (wp_id).
 */
export const IMPORT_DIR = process.env.IMPORT_DIR ?? (isServerless() ? '/tmp/aster-imports' : path.join(process.cwd(), 'data', 'imports'));
const running = new Map<string, { cancel: boolean }>();
export interface ImportPreview { total: number; publishable: number; categories: { name: string; count: number; existingId: string }[]; authors: string[]; sample: string[]; existing: number }

export async function createJob(opts: WpImportOptions, userId: string): Promise<ImportJob> {
  if (opts.source === 'wxr' && (!opts.file || !fs.existsSync(path.join(IMPORT_DIR, path.basename(opts.file))))) throw new Error('File di esportazione non trovato: caricalo di nuovo.');
  if (opts.source === 'rest' && !/^https?:\/\//.test(opts.url ?? '')) throw new Error("Inserisci l'indirizzo completo del sito WordPress (https://...).");
  const job: ImportJob = { id: uid('job'), source: opts.source, status: 'queued', options: { ...opts, userId }, file: opts.file ? path.basename(opts.file) : '', total: 0, processed: 0, imported: 0, skipped: 0, errors: [], message: 'In coda', cursor: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await repo.insertJob(job);
  return job;
}
export function cancelJob(id: string): void { const r = running.get(id); if (r) r.cancel = true; }
/** Avvia (o riprende) il job. Su serverless lavora a tranche di ~50 s e si riprogramma da solo finché non finisce. */
export function runJobInBackground(id: string): void {
  if (running.has(id)) return;
  running.set(id, { cancel: false });
  const budgetMs = isServerless() ? 50_000 : 6 * 60 * 60 * 1000;
  setImmediate(() => { runJob(id, budgetMs).then((finished) => { if (!finished) setTimeout(() => runJobInBackground(id), 100); }).catch(async (e) => { await repo.updateJob(id, { status: 'failed', message: (e as Error).message }); }).finally(() => running.delete(id)); });
}
/** Riprende i job rimasti "running" (es. dopo un riavvio o su una nuova istanza serverless). */
export async function resumePendingJobs(): Promise<void> {
  for (const jb of await repo.listJobs(5)) if ((jb.status === 'running' || jb.status === 'queued') && !running.has(jb.id) && Date.now() - Date.parse(jb.updatedAt || jb.createdAt) > 20_000) runJobInBackground(jb.id);
}

/** Legge un file WXR a blocchi e restituisce gli <item> uno alla volta, senza caricare tutto in memoria. */
async function* wxrItems(file: string): AsyncGenerator<string> {
  const stream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let buf = '';
  for await (const chunk of stream) {
    buf += chunk;
    let start = buf.indexOf('<item>');
    while (start >= 0) {
      const end = buf.indexOf('</item>', start);
      if (end < 0) break;
      yield buf.slice(start, end + 7);
      buf = buf.slice(end + 7);
      start = buf.indexOf('<item>');
    }
    if (start < 0 && buf.length > 4 * 1024 * 1024) buf = buf.slice(-64 * 1024);
  }
}

/** Autori dichiarati nell'intestazione del WXR (login → nome visualizzato ed email), prima del primo <item>. */
async function wxrAuthors(file: string): Promise<Map<string, { name: string; email: string }>> {
  const out = new Map<string, { name: string; email: string }>();
  const stream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 512 * 1024 });
  let head = '';
  for await (const chunk of stream) { head += chunk; if (head.includes('<item>') || head.length > 8 * 1024 * 1024) break; }
  stream.destroy();
  const un = (v: string) => v.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
  const tag = (block: string, t: string) => { const m = block.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)); return m ? un(m[1]) : ''; };
  for (const m of head.matchAll(/<wp:author>([\s\S]*?)<\/wp:author>/g)) {
    const login = tag(m[1], 'wp:author_login'); if (!login) continue;
    out.set(login, { name: tag(m[1], 'wp:author_display_name') || login, email: tag(m[1], 'wp:author_email') });
  }
  return out;
}

async function* wxrPosts(file: string, onCount?: (attachments: number) => void): AsyncGenerator<WpPost> {
  const authors = await wxrAuthors(file);
  // Passata 1: mappa degli allegati (id → url) per le immagini in evidenza, che possono comparire dopo l'articolo.
  const attachments = new Map<string, string>();
  for await (const it of wxrItems(file)) { const p = parseWxrItem(it, attachments); if (p && p.type === 'attachment') attachments.set(p.wpId, p.image); }
  onCount?.(attachments.size);
  for await (const it of wxrItems(file)) {
    const p = parseWxrItem(it, attachments);
    if (!p || p.type !== 'post') continue;
    const a = authors.get(p.author); if (a) { p.author = a.name; p.authorEmail = a.email; }
    yield p;
  }
}
async function* restPosts(url: string, max: number, onTotal?: (t: number) => void, skip = 0): AsyncGenerator<WpPost> {
  let n = 0;
  for (let page = Math.floor(skip / 50) + 1; n < max && page <= 4000; page++) {
    const { posts, total } = await fetchWpRestPage(url, page, 50);
    if (page === 1) onTotal?.(Math.min(max, total || max));
    if (!posts.length) break;
    for (const [i, p] of posts.entries()) { if ((page - 1) * 50 + i < skip) continue; if (n >= max) return; n++; yield p; }
    if (posts.length < 50) break;
  }
}
async function countWxr(file: string): Promise<number> { let n = 0; for await (const it of wxrItems(file)) if (it.includes('<wp:post_type><![CDATA[post]]>') || it.includes('<wp:post_type>post</wp:post_type>')) n++; return n; }

export async function previewImport(opts: WpImportOptions): Promise<ImportPreview> {
  const cats = new Map<string, number>(); const authors = new Set<string>(); const sample: string[] = [];
  let total = 0, publishable = 0, existing = 0;
  const gen = opts.source === 'wxr' ? wxrPosts(path.join(IMPORT_DIR, path.basename(opts.file ?? ''))) : restPosts(opts.url!, Math.min(opts.maxPosts ?? 200, 300));
  for await (const p of gen) {
    total++; if (p.status === 'publish') publishable++;
    p.categories.forEach((c) => cats.set(c, (cats.get(c) ?? 0) + 1)); if (p.author) authors.add(p.author);
    if (sample.length < 8) sample.push(p.title);
    if (total <= 500 && (await repo.findArticleByWpId(p.wpId))) existing++;
    if (opts.source === 'wxr' && total >= 5000) break; // anteprima: basta un campione
  }
  const existingCats = await repo.listCategories();
  return { total, publishable, existing, authors: [...authors].slice(0, 20), sample, categories: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60).map(([name, count]) => ({ name, count, existingId: existingCats.find((c) => c.name.toLowerCase() === name.toLowerCase() || c.slug === slugify(name))?.id ?? '' })) };
}

async function runJob(id: string, budgetMs: number): Promise<boolean> {
  const started = Date.now();
  const job = await repo.findJob(id);
  if (!job || job.status === 'cancelled' || job.status === 'done') return true;
  const resumeFrom = Number(job.cursor || 0);
  const opts = job.options as unknown as WpImportOptions & { userId: string };
  const state = running.get(id)!;
  await repo.updateJob(id, { status: 'running', message: 'Analisi in corso…' });
  const cfg = await getSeoSettings();
  const catCache = new Map<string, string>(); const authorCache = new Map<string, string>();
  let categories: Category[] = await repo.listCategories();
  const usedSlugs = new Set<string>();
  const errors: string[] = [];
  let processed = job.processed, imported = job.imported, skipped = job.skipped, total = job.total;
  let index = 0;
  const file = opts.source === 'wxr' ? path.join(IMPORT_DIR, path.basename(opts.file ?? '')) : '';
  if (opts.source === 'wxr' && !total) { total = await countWxr(file); await repo.updateJob(id, { total, message: `${total} articoli trovati` }); }

  const resolveCategory = async (names: string[]): Promise<string> => {
    for (const n of names) {
      const mapped = opts.categoryMap?.[n];
      if (mapped === '__skip') continue;
      if (mapped && mapped !== '__new') return mapped;
      if (catCache.has(n)) return catCache.get(n)!;
      const existing = categories.find((c) => c.name.toLowerCase() === n.toLowerCase() || c.slug === slugify(n));
      if (existing && mapped !== '__new') { catCache.set(n, existing.id); return existing.id; }
      const created: Category = { id: uid('c'), slug: slugify(n) || uid('c'), name: n, kind: 'standard', color: '#22418f', description: `Notizie di ${n.toLowerCase()}.`, order: categories.length + 1, showInMenu: false, showOnHome: false };
      await repo.upsertCategory(created); categories = [...categories, created]; catCache.set(n, created.id);
      return created.id;
    }
    return categories.find((c) => c.kind === 'standard')?.id ?? categories[0]?.id ?? '';
  };
  const resolveAuthor = async (name: string, email?: string): Promise<string> => {
    if (!name) return opts.userId;
    if (authorCache.has(name)) return authorCache.get(name)!;
    const found = (email ? await repo.findUserByEmail(email) : undefined) ?? await repo.findUserByName(name);
    if (found) { authorCache.set(name, found.id); return found.id; }
    const u: User = { id: uid('u'), name, email: email || `${slugify(name) || uid('u')}@importato.local`, role: 'contributor', avatar: `https://picsum.photos/seed/${slugify(name)}/200/200`, bio: 'Autore importato da WordPress.', active: false, createdAt: new Date().toISOString() };
    await repo.upsertUser(u); authorCache.set(name, u.id);
    return u.id;
  };
  const tagIdByName = new Map<string, string>();
  const resolveTag = async (name: string): Promise<string | null> => {
    const slug = slugify(name); if (!slug) return null;
    if (tagIdByName.has(slug)) return tagIdByName.get(slug)!;
    const t = (await repo.findTagBySlug(slug)) ?? { id: uid('t'), slug, name: name.trim() };
    if (!(await repo.findTagBySlug(slug))) await repo.upsertTag(t);
    tagIdByName.set(slug, t.id); return t.id;
  };

  let pending: { a: Article; wpId?: string }[] = [];
  const flush = async () => { if (pending.length) { await repo.bulkUpsertArticles(pending); pending = []; } await repo.updateJob(id, { processed, imported, skipped, total: Math.max(total, processed), errors, cursor: String(index), message: `Importati ${imported} su ${processed}` }); };
  const gen = opts.source === 'wxr' ? wxrPosts(file) : restPosts(opts.url!, opts.maxPosts ?? 100000, async (t) => { total = t; await repo.updateJob(id, { total: t }); }, resumeFrom);
  let ctxCache: { at: number; ctx: Awaited<ReturnType<typeof seoContext>> } | null = null;
  const ctxFor = async () => { if (!ctxCache || Date.now() - ctxCache.at > 60000) ctxCache = { at: Date.now(), ctx: await seoContext('') }; return ctxCache.ctx; };

  for await (const p of gen) {
    index++;
    if (opts.source === 'wxr' && index <= resumeFrom) continue; // ripresa: salta gli item già elaborati
    if (state.cancel) { await flush(); await repo.updateJob(id, { status: 'cancelled', message: 'Annullata.' }); return true; }
    if (Date.now() - started > budgetMs) { await flush(); await repo.updateJob(id, { status: 'running', message: `In corso: ${imported} importati (ripresa automatica)` }); return false; }
    processed++;
    try {
      if (!p.title.trim() || !p.content.trim()) { skipped++; continue; }
      const existing = await repo.findArticleByWpId(p.wpId);
      if (existing && !opts.overwrite) { skipped++; continue; }
      const legacyUrl = (() => { try { const u = new URL(p.link); const path = u.pathname.replace(/\/+$/, ''); return path && path !== '/' && !u.search.includes('p=') ? path : ''; } catch { return ''; } })();
      const tagIds: string[] = [];
      for (const t of p.tags.slice(0, 15)) { const tid = await resolveTag(t); if (tid) tagIds.push(tid); }
      const status: ArticleStatus = opts.statusMode === 'draft' ? 'draft' : opts.statusMode === 'review' ? 'review' : p.status === 'publish' ? 'published' : p.status === 'pending' ? 'review' : 'draft';
      const date = p.date && !p.date.startsWith('0000') && !Number.isNaN(Date.parse(p.date)) ? new Date(p.date).toISOString() : new Date().toISOString();
      let slug = p.slug || slugify(p.title) || uid('a');
      if (!existing && (usedSlugs.has(slug) || (await repo.slugExists(slug, '')))) slug = `${slug}-${createHash('md5').update(p.wpId + p.link).digest('hex').slice(0, 6)}`;
      usedSlugs.add(slug);
      const aid = existing?.id ?? uid('a');
      let article: Article = {
        id: aid, slug, kicker: p.categories[0] ?? '', title: p.title, subtitle: p.excerpt.slice(0, 200), excerpt: p.excerpt.slice(0, 300), content: p.content, coverImage: p.image, coverCaption: '',
        categoryId: await resolveCategory(p.categories), tagIds, authorId: await resolveAuthor(p.author, p.authorEmail), zoneId: '', address: '', status, format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false,
        featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: existing?.views ?? 0,
        publishedAt: status === 'published' ? date : null, scheduledAt: null, createdAt: date, updatedAt: new Date().toISOString(), legacyUrl, seoReport: [`importato da WordPress (${p.link})`],
      };
      if (opts.optimize) {
        const ctx = await ctxFor();
        const r = optimizeArticle(article, ctx, { fillMeta: true, links: cfg.autoInternalLinks, maxLinks: cfg.maxInternalLinks, fixImages: cfg.fixImages, siteUrl: siteUrl(), overwriteSlug: false });
        article = r.article; article.seoReport = [...(article.seoReport ?? []), ...r.changes.map((c) => `ottimizzato: ${c}`)];
        article.seoScore = analyze(article, ctx).score;
      }
      pending.push({ a: article, wpId: p.wpId });
      imported++;
      if (pending.length >= 200) await flush();
    } catch (e) { errors.push(`${p.title.slice(0, 80)}: ${(e as Error).message}`); skipped++; }
  }
  await flush();
  invalidateProfiles();
  await repo.updateJob(id, { status: 'done', processed, imported, skipped, total: Math.max(total, processed), errors, message: `Completata: ${imported} importati, ${skipped} saltati` });
  if (opts.downloadMedia) await downloadMedia(id, state);
  return true;
}

/** Scarica le copertine remote in public/uploads (solo su filesystem persistente) con concorrenza limitata. */
async function downloadMedia(jobId: string, state: { cancel: boolean }): Promise<void> {
  // Scarica copertine e immagini nel testo dal sito di origine e le salva nello storage configurato, riscrivendo gli URL.
  const { importRemoteImage } = await import('./storage');
  const cache = new Map<string, string>();
  const fetchOne = async (src: string): Promise<string | null> => { if (cache.has(src)) return cache.get(src)!; const f = await importRemoteImage(src); if (f) cache.set(src, f.url); return f?.url ?? null; };
  const isRemote = (u: string) => /^https?:\/\//.test(u) && !u.includes('picsum.photos') && !/supabase\.co\/storage|blob\.vercel-storage\.com/.test(u);
  let offset = 0, done = 0;
  for (;;) {
    if (state.cancel) return;
    const batch = await repo.listArticles({}, 'created', 50, offset);
    if (!batch.length) break;
    offset += batch.length;
    for (const a of batch) {
      if (state.cancel) return;
      let content = a.content; let cover = a.coverImage; let changed = false;
      if (cover && isRemote(cover)) { const u = await fetchOne(cover); if (u) { cover = u; changed = true; done++; } }
      const srcs = [...content.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter(isRemote);
      for (const src of [...new Set(srcs)].slice(0, 30)) { const u = await fetchOne(src); if (u) { content = content.split(src).join(u); changed = true; done++; } }
      if (changed) await repo.upsertArticle({ ...a, coverImage: cover, content });
    }
    await repo.updateJob(jobId, { message: `Completata. Immagini trasferite nello storage: ${done}` });
  }
}
