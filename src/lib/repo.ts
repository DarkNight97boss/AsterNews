import 'server-only';
import { all, batch, get, run, type Stmt } from './db';
import { ActivityEntry, Article, ArticleStatus, Category, Comment, Database, Event, MediaItem, Report, SiteSettings, Subscriber, Tag, User, Zone } from './models';
import { stripHtml } from './utils';

type Row = Record<string, unknown>;
const b = (v: unknown) => (v ? 1 : 0);
const j = (v: unknown) => JSON.stringify(v ?? null);
const pj = <T,>(s: unknown, fallback: T): T => { try { return s ? (JSON.parse(String(s)) as T) : fallback; } catch { return fallback; } };

// ---------------- Mapping ----------------
export function rowToArticle(r: Row): Article {
  return {
    id: String(r.id), slug: String(r.slug), kicker: String(r.kicker ?? ''), title: String(r.title ?? ''), subtitle: String(r.subtitle ?? ''), excerpt: String(r.excerpt ?? ''), content: String(r.content ?? ''),
    coverImage: String(r.cover_image ?? ''), coverCaption: String(r.cover_caption ?? ''), categoryId: String(r.category_id ?? ''), authorId: String(r.author_id ?? ''), zoneId: String(r.zone_id ?? ''), address: String(r.address ?? ''),
    status: r.status as ArticleStatus, format: r.format as Article['format'], videoUrl: String(r.video_url ?? ''), gallery: pj<string[]>(r.gallery, []), liveUpdates: pj<Article['liveUpdates']>(r.live_updates, []), liveActive: !!r.live_active,
    featured: !!r.featured, breaking: !!r.breaking, sponsored: !!r.sponsored, allowComments: !!r.allow_comments, seo: { title: '', description: '', canonical: '', noIndex: false, ...pj<Partial<Article['seo']>>(r.seo, {}) }, tagIds: pj<string[]>(r.tag_ids, []),
    views: Number(r.views ?? 0), publishedAt: (r.published_at as string | null) ?? null, scheduledAt: (r.scheduled_at as string | null) ?? null, createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? ''),
    seoScore: r.seo_score == null ? undefined : Number(r.seo_score), seoReport: r.seo_report ? pj<string[]>(r.seo_report, []) : undefined, legacyUrl: r.legacy_url ? String(r.legacy_url) : undefined,
  };
}
const rowToCategory = (r: Row): Category => ({ id: String(r.id), slug: String(r.slug), name: String(r.name), kind: r.kind as Category['kind'], color: String(r.color ?? '#22418f'), description: String(r.description ?? ''), order: Number(r.ord ?? 0), showInMenu: !!r.show_in_menu, showOnHome: !!r.show_on_home });
const rowToTag = (r: Row): Tag => ({ id: String(r.id), slug: String(r.slug), name: String(r.name) });
const rowToUser = (r: Row): User => ({ id: String(r.id), name: String(r.name), email: String(r.email), role: r.role as User['role'], avatar: String(r.avatar ?? ''), bio: String(r.bio ?? ''), active: !!r.active, createdAt: String(r.created_at ?? '') });
const rowToZone = (r: Row): Zone => ({ id: String(r.id), slug: String(r.slug), name: String(r.name), kind: r.kind as Zone['kind'] });
const rowToComment = (r: Row): Comment => ({ id: String(r.id), articleId: String(r.article_id), authorName: String(r.author_name ?? ''), email: String(r.email ?? ''), body: String(r.body ?? ''), status: r.status as Comment['status'], createdAt: String(r.created_at ?? '') });
const rowToMedia = (r: Row): MediaItem => ({ id: String(r.id), name: String(r.name ?? ''), url: String(r.url), alt: String(r.alt ?? ''), type: (r.type as MediaItem['type']) ?? 'image', size: Number(r.size ?? 0), uploadedBy: String(r.uploaded_by ?? ''), createdAt: String(r.created_at ?? '') });
const rowToEvent = (r: Row): Event => ({ id: String(r.id), slug: String(r.slug), title: String(r.title), description: String(r.description ?? ''), type: r.type as Event['type'], dateFrom: String(r.date_from), dateTo: (r.date_to as string | null) ?? null, timeInfo: String(r.time_info ?? ''), place: String(r.place ?? ''), address: String(r.address ?? ''), zoneId: String(r.zone_id ?? ''), price: String(r.price ?? ''), free: !!r.free, image: String(r.image ?? ''), rating: Number(r.rating ?? 0), status: r.status as Event['status'], submittedBy: String(r.submitted_by ?? ''), createdAt: String(r.created_at ?? '') });
const rowToReport = (r: Row): Report => ({ id: String(r.id), name: String(r.name ?? ''), email: String(r.email ?? ''), zoneId: String(r.zone_id ?? ''), subject: String(r.subject ?? ''), body: String(r.body ?? ''), image: String(r.image ?? ''), status: r.status as Report['status'], reply: String(r.reply ?? ''), createdAt: String(r.created_at ?? '') });

// ---------------- Articoli ----------------
export interface ArticleFilter { status?: ArticleStatus | ArticleStatus[]; categoryId?: string; authorId?: string; zoneId?: string; tagId?: string; format?: Article['format']; featured?: boolean; breaking?: boolean; liveActive?: boolean; q?: string; excludeIds?: string[]; kinds?: string[]; notKinds?: string[] }
export type ArticleSort = 'published' | 'updated' | 'views' | 'title' | 'created';

function where(f: ArticleFilter, params: unknown[]): string {
  const w: string[] = [];
  if (f.status) { const arr = Array.isArray(f.status) ? f.status : [f.status]; w.push(`a.status IN (${arr.map(() => '?').join(',')})`); params.push(...arr); }
  if (f.categoryId) { w.push('a.category_id = ?'); params.push(f.categoryId); }
  if (f.authorId) { w.push('a.author_id = ?'); params.push(f.authorId); }
  if (f.zoneId) { w.push('a.zone_id = ?'); params.push(f.zoneId); }
  if (f.format) { w.push('a.format = ?'); params.push(f.format); }
  if (f.featured !== undefined) { w.push('a.featured = ?'); params.push(b(f.featured)); }
  if (f.breaking !== undefined) { w.push('a.breaking = ?'); params.push(b(f.breaking)); }
  if (f.liveActive !== undefined) { w.push('a.live_active = ?'); params.push(b(f.liveActive)); }
  if (f.tagId) { w.push('a.id IN (SELECT article_id FROM article_tags WHERE tag_id = ?)'); params.push(f.tagId); }
  if (f.q) { w.push('(a.title ILIKE ? OR a.slug ILIKE ?)'); params.push(`%${f.q}%`, `%${f.q}%`); }
  if (f.excludeIds?.length) { w.push(`a.id NOT IN (${f.excludeIds.map(() => '?').join(',')})`); params.push(...f.excludeIds); }
  if (f.kinds?.length) { w.push(`a.category_id IN (SELECT id FROM categories WHERE kind IN (${f.kinds.map(() => '?').join(',')}))`); params.push(...f.kinds); }
  if (f.notKinds?.length) { w.push(`a.category_id NOT IN (SELECT id FROM categories WHERE kind IN (${f.notKinds.map(() => '?').join(',')}))`); params.push(...f.notKinds); }
  return w.length ? 'WHERE ' + w.join(' AND ') : '';
}
const ORDER: Record<ArticleSort, string> = { published: 'a.published_at DESC', updated: 'a.updated_at DESC', views: 'a.views DESC', title: 'lower(a.title) ASC', created: 'a.created_at DESC' };

export async function listArticles(f: ArticleFilter, sort: ArticleSort = 'published', limit = 50, offset = 0, dir: 'asc' | 'desc' | null = null): Promise<Article[]> {
  const params: unknown[] = [];
  let order = ORDER[sort];
  if (dir) order = order.replace(/ASC|DESC/, dir.toUpperCase());
  const rows = await all(`SELECT a.* FROM articles a ${where(f, params)} ORDER BY ${order}, a.id LIMIT ? OFFSET ?`, [...(params), limit, offset]) as Row[];
  return rows.map(rowToArticle);
}
export async function countArticles(f: ArticleFilter): Promise<number> {
  const params: unknown[] = [];
  return Number((await get(`SELECT COUNT(*) c FROM articles a ${where(f, params)}`, [...(params)]) as Row).c);
}
export async function findArticle(id: string): Promise<Article | undefined> {
  const r = await get('SELECT * FROM articles WHERE id = ?', [id]) as Row | undefined;
  return r ? rowToArticle(r) : undefined;
}
export async function findArticleBySlug(slug: string, publishedOnly = true): Promise<Article | undefined> {
  const r = await get(`SELECT * FROM articles WHERE slug = ? ${publishedOnly ? "AND status = 'published'" : ''}`, [slug]) as Row | undefined;
  return r ? rowToArticle(r) : undefined;
}
export async function findArticleByLegacy(path: string): Promise<Article | undefined> {
  const r = await get("SELECT * FROM articles WHERE status = 'published' AND (legacy_url = ? OR legacy_url = ?)", [path, path + '.html']) as Row | undefined;
  return r ? rowToArticle(r) : undefined;
}
export async function findArticleByWpId(wpId: string): Promise<Article | undefined> {
  const r = await get('SELECT * FROM articles WHERE wp_id = ?', [wpId]) as Row | undefined;
  return r ? rowToArticle(r) : undefined;
}
export async function slugExists(slug: string, excludeId: string): Promise<boolean> {
  return !!await get('SELECT 1 FROM articles WHERE slug = ? AND id <> ?', [slug, excludeId]);
}
const searchText = (a: Article) => `${a.title} ${a.title} ${a.kicker} ${a.subtitle} ${a.excerpt} ${stripHtml(a.content).slice(0, 20000)}`;
function tagStmts(a: Article): { sql: string; args: unknown[] }[] {
  return [{ sql: 'DELETE FROM article_tags WHERE article_id = ?', args: [a.id] }, ...a.tagIds.map((t) => ({ sql: 'INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING', args: [a.id, t] }))];
}
const UPSERT_ARTICLE = `INSERT INTO articles (id, slug, kicker, title, subtitle, excerpt, content, cover_image, cover_caption, category_id, author_id, zone_id, address, status, format, video_url, gallery, live_updates, live_active, featured, breaking, sponsored, allow_comments, seo, tag_ids, views, published_at, scheduled_at, created_at, updated_at, seo_score, seo_report, legacy_url, wp_id, search_text)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, kicker=excluded.kicker, title=excluded.title, subtitle=excluded.subtitle, excerpt=excluded.excerpt, content=excluded.content, cover_image=excluded.cover_image, cover_caption=excluded.cover_caption, category_id=excluded.category_id, author_id=excluded.author_id, zone_id=excluded.zone_id, address=excluded.address, status=excluded.status, format=excluded.format, video_url=excluded.video_url, gallery=excluded.gallery, live_updates=excluded.live_updates, live_active=excluded.live_active, featured=excluded.featured, breaking=excluded.breaking, sponsored=excluded.sponsored, allow_comments=excluded.allow_comments, seo=excluded.seo, tag_ids=excluded.tag_ids, views=excluded.views, published_at=excluded.published_at, scheduled_at=excluded.scheduled_at, created_at=excluded.created_at, updated_at=excluded.updated_at, seo_score=excluded.seo_score, seo_report=excluded.seo_report, legacy_url=excluded.legacy_url, wp_id=COALESCE(excluded.wp_id, articles.wp_id), search_text=excluded.search_text`;
export function articleStmts(a: Article, opts: { wpId?: string } = {}): { sql: string; args: unknown[] }[] {
  const args = [a.id, a.slug, a.kicker, a.title, a.subtitle, a.excerpt, a.content, a.coverImage, a.coverCaption, a.categoryId, a.authorId, a.zoneId ?? '', a.address ?? '', a.status, a.format, a.videoUrl, j(a.gallery), j(a.liveUpdates), b(a.liveActive), b(a.featured), b(a.breaking), b(a.sponsored), b(a.allowComments), j(a.seo), j(a.tagIds), a.views, a.publishedAt, a.scheduledAt, a.createdAt, a.updatedAt, a.seoScore ?? null, a.seoReport ? j(a.seoReport) : null, a.legacyUrl ?? null, opts.wpId ?? null, searchText(a)];
  return [{ sql: UPSERT_ARTICLE, args }, ...tagStmts(a)];
}
/** Inserisce o aggiorna un articolo (riga, tag, indice full-text) in una sola transazione. */
export async function upsertArticle(a: Article, opts: { wpId?: string } = {}): Promise<void> { await batch(articleStmts(a, opts)); }
export async function patchArticle(id: string, patch: Partial<Record<'status' | 'published_at' | 'scheduled_at' | 'updated_at' | 'cover_image' | 'seo_score', string | number | null>>): Promise<void> {
  const keys = Object.keys(patch); if (!keys.length) return;
  await run(`UPDATE articles SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...(Object.values(patch)), id]);
}
export async function deleteArticleRow(id: string): Promise<void> {
  await batch([{ sql: 'DELETE FROM articles WHERE id = ?', args: [id] }, { sql: 'DELETE FROM article_tags WHERE article_id = ?', args: [id] }, { sql: 'DELETE FROM comments WHERE article_id = ?', args: [id] }]);
}
export async function incrementViews(id: string): Promise<void> { await run('UPDATE articles SET views = views + 1 WHERE id = ?', [id]); }
/** Promuove gli articoli programmati la cui data è passata (chiamata a ogni richiesta, costa una query indicizzata). */
export async function promoteScheduled(): Promise<void> {
  await run("UPDATE articles SET status = 'published', published_at = scheduled_at, scheduled_at = NULL WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?", [new Date().toISOString()]);
}
export async function countByStatus(f: { authorId?: string } = {}): Promise<Record<ArticleStatus, number>> {
  const r: Record<ArticleStatus, number> = { draft: 0, review: 0, scheduled: 0, published: 0, archived: 0 };
  const rows = (f.authorId ? await all('SELECT status, COUNT(*) c FROM articles WHERE author_id = ? GROUP BY status', [f.authorId]) : await all('SELECT status, COUNT(*) c FROM articles GROUP BY status')) as Row[];
  rows.forEach((x) => { r[x.status as ArticleStatus] = Number(x.c); });
  return r;
}
export async function searchArticles(q: string, limit = 50, offset = 0): Promise<{ items: Article[]; total: number }> {
  const t = q.trim();
  if (!t) return { items: [], total: 0 };
  const rows = await all<Row>("SELECT a.* FROM articles a WHERE a.status = 'published' AND a.search @@ plainto_tsquery('italian', ?) ORDER BY ts_rank(a.search, plainto_tsquery('italian', ?)) DESC, a.published_at DESC LIMIT ? OFFSET ?", [t, t, limit, offset]);
  const total = Number(((await get<Row>("SELECT COUNT(*) c FROM articles a WHERE a.status = 'published' AND a.search @@ plainto_tsquery('italian', ?)", [t])) ?? { c: 0 }).c);
  if (!rows.length && total === 0) {
    const like = `%${t}%`;
    const alt = await all<Row>("SELECT * FROM articles WHERE status = 'published' AND (title ILIKE ? OR subtitle ILIKE ?) ORDER BY published_at DESC LIMIT ? OFFSET ?", [like, like, limit, offset]);
    return { items: alt.map(rowToArticle), total: alt.length };
  }
  return { items: rows.map(rowToArticle), total };
}
export async function relatedArticles(a: Article, n = 4): Promise<Article[]> {
  const tagIn = a.tagIds.length ? a.tagIds.map(() => '?').join(',') : "''";
  const tagClause = a.tagIds.length ? `(SELECT COUNT(*) FROM article_tags t WHERE t.article_id = x.id AND t.tag_id IN (${tagIn}))` : '0';
  const rows = await all<Row>(`SELECT x.* FROM articles x WHERE x.status = 'published' AND x.id <> ? AND (x.category_id = ? OR x.id IN (SELECT article_id FROM article_tags WHERE tag_id IN (${tagIn}))) ORDER BY (${tagClause} + CASE WHEN x.category_id = ? THEN 2 ELSE 0 END) DESC, x.published_at DESC LIMIT ?`,
    [a.id, a.categoryId, ...a.tagIds, ...a.tagIds, a.categoryId, n]);
  return rows.map(rowToArticle);
}
export async function zoneCounts(): Promise<Record<string, number>> {
  const r: Record<string, number> = {};
  (await all("SELECT zone_id z, COUNT(*) c FROM articles WHERE status = 'published' AND zone_id <> '' GROUP BY zone_id") as Row[]).forEach((x) => { r[String(x.z)] = Number(x.c); });
  return r;
}
export async function categoryCounts(): Promise<Record<string, number>> {
  const r: Record<string, number> = {};
  (await all('SELECT category_id z, COUNT(*) c FROM articles GROUP BY category_id') as Row[]).forEach((x) => { r[String(x.z)] = Number(x.c); });
  return r;
}
export async function tagCounts(): Promise<Record<string, number>> {
  const r: Record<string, number> = {};
  (await all('SELECT tag_id z, COUNT(*) c FROM article_tags GROUP BY tag_id') as Row[]).forEach((x) => { r[String(x.z)] = Number(x.c); });
  return r;
}
export async function topTagsForCategory(categoryId: string, limit = 8): Promise<Tag[]> {
  return (await all("SELECT t.* FROM article_tags at JOIN articles a ON a.id = at.article_id JOIN tags t ON t.id = at.tag_id WHERE a.category_id = ? AND a.status = 'published' GROUP BY t.id ORDER BY COUNT(*) DESC LIMIT ?", [categoryId, limit]) as Row[]).map(rowToTag);
}
export async function sumViews(): Promise<number> { return Number((await get("SELECT COALESCE(SUM(views),0) s FROM articles") as Row).s); }
export async function countPublishedToday(): Promise<number> { return Number((await get("SELECT COUNT(*) c FROM articles WHERE status='published' AND published_at >= ?", [new Date(new Date().setHours(0, 0, 0, 0)).toISOString()]) as Row).c); }
export async function avgSeoScore(): Promise<{ avg: number; n: number }> { const r = await get("SELECT AVG(seo_score) a, COUNT(seo_score) n FROM articles WHERE status='published'") as Row; return { avg: Math.round(Number(r.a ?? 0)), n: Number(r.n ?? 0) }; }

// ---------------- Categorie, tag, utenti, zone ----------------
export const listCategories = async (): Promise<Category[]> => (await all('SELECT * FROM categories ORDER BY ord, name') as Row[]).map(rowToCategory);
export const findCategory = async (id: string): Promise<Category | undefined> => { const r = await get('SELECT * FROM categories WHERE id = ?', [id]) as Row | undefined; return r ? rowToCategory(r) : undefined; };
export const findCategoryBySlug = async (slug: string): Promise<Category | undefined> => { const r = await get('SELECT * FROM categories WHERE slug = ?', [slug]) as Row | undefined; return r ? rowToCategory(r) : undefined; };
export const findCategoryByName = async (name: string): Promise<Category | undefined> => { const r = await get('SELECT * FROM categories WHERE lower(name) = lower(?) OR slug = ?', [name, name]) as Row | undefined; return r ? rowToCategory(r) : undefined; };
export async function upsertCategory(c: Category): Promise<void> { await run('INSERT INTO categories (id, slug, name, kind, color, description, ord, show_in_menu, show_on_home) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, name=excluded.name, kind=excluded.kind, color=excluded.color, description=excluded.description, ord=excluded.ord, show_in_menu=excluded.show_in_menu, show_on_home=excluded.show_on_home', [c.id, c.slug, c.name, c.kind, c.color, c.description, c.order, b(c.showInMenu), b(c.showOnHome)]); }
export async function deleteCategoryRow(id: string, fallbackId: string): Promise<void> { await run('UPDATE articles SET category_id = ? WHERE category_id = ?', [fallbackId, id]); await run('DELETE FROM categories WHERE id = ?', [id]); }
export const listTags = async (limit = 5000): Promise<Tag[]> => (await all('SELECT * FROM tags ORDER BY lower(name) LIMIT ?', [limit]) as Row[]).map(rowToTag);
export const topTags = async (limit = 300): Promise<Tag[]> => (await all('SELECT t.* FROM tags t LEFT JOIN article_tags at ON at.tag_id = t.id GROUP BY t.id ORDER BY COUNT(at.article_id) DESC, t.name LIMIT ?', [limit]) as Row[]).map(rowToTag);
export const searchTags = async (q: string, limit = 50): Promise<Tag[]> => (await all('SELECT * FROM tags WHERE name ILIKE ? ORDER BY name LIMIT ?', [`%${q}%`, limit]) as Row[]).map(rowToTag);
export const countTags = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM tags') as Row).c);
export const findTag = async (id: string): Promise<Tag | undefined> => { const r = await get('SELECT * FROM tags WHERE id = ?', [id]) as Row | undefined; return r ? rowToTag(r) : undefined; };
export const findTagBySlug = async (slug: string): Promise<Tag | undefined> => { const r = await get('SELECT * FROM tags WHERE slug = ?', [slug]) as Row | undefined; return r ? rowToTag(r) : undefined; };
export const tagsByIds = async (ids: string[]): Promise<Tag[]> => (ids.length ? (await all<Row>(`SELECT * FROM tags WHERE id IN (${ids.map(() => '?').join(',')})`, ids)).map(rowToTag) : []);
export async function upsertTag(t: Tag): Promise<void> { await run('INSERT INTO tags (id, slug, name) VALUES (?,?,?) ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, name=excluded.name', [t.id, t.slug, t.name]); }
export async function deleteTagRow(id: string): Promise<void> { await run('DELETE FROM tags WHERE id = ?', [id]); await run('DELETE FROM article_tags WHERE tag_id = ?', [id]); await run("UPDATE articles SET tag_ids = (SELECT COALESCE(json_agg(v)::text, '[]') FROM json_array_elements_text(articles.tag_ids::json) v WHERE v <> ?) WHERE tag_ids LIKE ?", [id, `%${id}%`]); }
export const listUsers = async (): Promise<User[]> => (await all('SELECT * FROM users ORDER BY created_at') as Row[]).map(rowToUser);
export const findUser = async (id: string): Promise<User | undefined> => { const r = await get('SELECT * FROM users WHERE id = ?', [id]) as Row | undefined; return r ? rowToUser(r) : undefined; };
export const findUserByEmail = async (email: string): Promise<User | undefined> => { const r = await get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]) as Row | undefined; return r ? rowToUser(r) : undefined; };
export const findUserByName = async (name: string): Promise<User | undefined> => { const r = await get('SELECT * FROM users WHERE lower(name) = lower(?)', [name]) as Row | undefined; return r ? rowToUser(r) : undefined; };
export async function upsertUser(u: User): Promise<void> { await run('INSERT INTO users (id, name, email, role, avatar, bio, active, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET name=excluded.name, email=excluded.email, role=excluded.role, avatar=excluded.avatar, bio=excluded.bio, active=excluded.active, created_at=excluded.created_at', [u.id, u.name, u.email, u.role, u.avatar, u.bio, b(u.active), u.createdAt]); }
export async function deleteUserRow(id: string): Promise<void> { await run('DELETE FROM users WHERE id = ?', [id]); }
export const userHasArticles = async (id: string): Promise<boolean> => !!await get('SELECT 1 FROM articles WHERE author_id = ? LIMIT 1', [id]);
export const listZones = async (): Promise<Zone[]> => (await all('SELECT * FROM zones ORDER BY lower(name)') as Row[]).map(rowToZone);
export const findZone = async (id: string): Promise<Zone | undefined> => { const r = await get('SELECT * FROM zones WHERE id = ?', [id]) as Row | undefined; return r ? rowToZone(r) : undefined; };
export const findZoneBySlug = async (slug: string): Promise<Zone | undefined> => { const r = await get('SELECT * FROM zones WHERE slug = ?', [slug]) as Row | undefined; return r ? rowToZone(r) : undefined; };
export async function upsertZone(z: Zone): Promise<void> { await run('INSERT INTO zones (id, slug, name, kind) VALUES (?,?,?,?) ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, name=excluded.name, kind=excluded.kind', [z.id, z.slug, z.name, z.kind]); }
export async function deleteZoneRow(id: string): Promise<void> { await run('DELETE FROM zones WHERE id = ?', [id]); await run("UPDATE articles SET zone_id = '' WHERE zone_id = ?", [id]); await run("UPDATE events SET zone_id = '' WHERE zone_id = ?", [id]); }

// ---------------- Commenti, media, iscritti, impostazioni, attività ----------------
export const listComments = async (status?: Comment['status'], limit = 500): Promise<Comment[]> => ((status ? await all('SELECT * FROM comments WHERE status = ? ORDER BY created_at DESC LIMIT ?', [status, limit]) : await all('SELECT * FROM comments ORDER BY created_at DESC LIMIT ?', [limit])) as Row[]).map(rowToComment);
export const commentsForArticle = async (articleId: string): Promise<Comment[]> => (await all("SELECT * FROM comments WHERE article_id = ? AND status = 'approved' ORDER BY created_at DESC", [articleId]) as Row[]).map(rowToComment);
export const countComments = async (status: Comment['status']): Promise<number> => Number((await get('SELECT COUNT(*) c FROM comments WHERE status = ?', [status]) as Row).c);
export async function insertComment(c: Comment): Promise<void> { await run('INSERT INTO comments (id, article_id, author_name, email, body, status, created_at) VALUES (?,?,?,?,?,?,?)', [c.id, c.articleId, c.authorName, c.email, c.body, c.status, c.createdAt]); }
export async function setCommentStatus(id: string, status: Comment['status']): Promise<void> { await run('UPDATE comments SET status = ? WHERE id = ?', [status, id]); }
export async function deleteCommentRow(id: string): Promise<void> { await run('DELETE FROM comments WHERE id = ?', [id]); }
export const listMedia = async (limit = 500, q = ''): Promise<MediaItem[]> => ((q ? await all('SELECT * FROM media WHERE name ILIKE ? OR alt ILIKE ? ORDER BY created_at DESC LIMIT ?', [`%${q}%`, `%${q}%`, limit]) : await all('SELECT * FROM media ORDER BY created_at DESC LIMIT ?', [limit])) as Row[]).map(rowToMedia);
export const countMedia = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM media') as Row).c);
export async function insertMedia(m: MediaItem): Promise<void> { await run('INSERT INTO media (id, name, url, alt, type, size, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?)', [m.id, m.name, m.url, m.alt, m.type, m.size, m.uploadedBy, m.createdAt]); }
export async function updateMediaRow(m: MediaItem): Promise<void> { await run('UPDATE media SET name = ?, alt = ? WHERE id = ?', [m.name, m.alt, m.id]); }
export async function deleteMediaRow(id: string): Promise<void> { await run('DELETE FROM media WHERE id = ?', [id]); }
export const listSubscribers = async (): Promise<Subscriber[]> => (await all('SELECT * FROM subscribers ORDER BY created_at DESC') as Row[]).map((r) => ({ id: String(r.id), email: String(r.email), createdAt: String(r.created_at) }));
export const countSubscribers = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM subscribers') as Row).c);
export async function insertSubscriber(s: Subscriber): Promise<void> { await run('INSERT INTO subscribers (id, email, created_at) VALUES (?,?,?) ON CONFLICT (email) DO NOTHING', [s.id, s.email, s.createdAt]); }
export async function deleteSubscriberRow(id: string): Promise<void> { await run('DELETE FROM subscribers WHERE id = ?', [id]); }
export async function getSettingsRow(): Promise<SiteSettings | null> { const r = await get("SELECT value FROM settings WHERE key = 'site'") as Row | undefined; return r ? pj<SiteSettings | null>(r.value, null) : null; }
export async function saveSettingsRow(s: SiteSettings): Promise<void> { await run("INSERT INTO settings (key, value) VALUES ('site', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [JSON.stringify(s)]); }
export const listActivity = async (limit = 20): Promise<ActivityEntry[]> => (await all('SELECT * FROM activity ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map((r) => ({ id: String(r.id), userId: String(r.user_id), action: String(r.action), target: String(r.target), createdAt: String(r.created_at) }));
export async function insertActivity(e: ActivityEntry): Promise<void> { await run('INSERT INTO activity (id, user_id, action, target, created_at) VALUES (?,?,?,?,?)', [e.id, e.userId, e.action, e.target, e.createdAt]); await run('DELETE FROM activity WHERE id NOT IN (SELECT id FROM activity ORDER BY created_at DESC LIMIT 500)'); }

// ---------------- Eventi, segnalazioni ----------------
export const listEvents = async (f: { status?: Event['status']; upcomingFrom?: string; zoneId?: string; type?: string; from?: string; to?: string } = {}, limit = 200): Promise<Event[]> => {
  const w: string[] = []; const p: unknown[] = [];
  if (f.status) { w.push('status = ?'); p.push(f.status); }
  if (f.upcomingFrom) { w.push('COALESCE(date_to, date_from) >= ?'); p.push(f.upcomingFrom); }
  if (f.zoneId) { w.push('zone_id = ?'); p.push(f.zoneId); }
  if (f.type) { w.push('type = ?'); p.push(f.type); }
  if (f.from) { w.push('COALESCE(date_to, date_from) >= ?'); p.push(f.from); }
  if (f.to) { w.push('date_from <= ?'); p.push(f.to); }
  return (await all(`SELECT * FROM events ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY date_from ASC, rating DESC LIMIT ?`, [...(p), limit]) as Row[]).map(rowToEvent);
};
export const listAllEvents = async (): Promise<Event[]> => (await all('SELECT * FROM events ORDER BY created_at DESC') as Row[]).map(rowToEvent);
export const findEventBySlug = async (slug: string): Promise<Event | undefined> => { const r = await get("SELECT * FROM events WHERE slug = ? AND status = 'published'", [slug]) as Row | undefined; return r ? rowToEvent(r) : undefined; };
export const eventSlugExists = async (slug: string, excludeId: string): Promise<boolean> => !!await get('SELECT 1 FROM events WHERE slug = ? AND id <> ?', [slug, excludeId]);
export const countEvents = async (status: Event['status']): Promise<number> => Number((await get('SELECT COUNT(*) c FROM events WHERE status = ?', [status]) as Row).c);
export async function upsertEvent(e: Event): Promise<void> { await run('INSERT INTO events (id, slug, title, description, type, date_from, date_to, time_info, place, address, zone_id, price, free, image, rating, status, submitted_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, title=excluded.title, description=excluded.description, type=excluded.type, date_from=excluded.date_from, date_to=excluded.date_to, time_info=excluded.time_info, place=excluded.place, address=excluded.address, zone_id=excluded.zone_id, price=excluded.price, free=excluded.free, image=excluded.image, rating=excluded.rating, status=excluded.status, submitted_by=excluded.submitted_by, created_at=excluded.created_at', [e.id, e.slug, e.title, e.description, e.type, e.dateFrom, e.dateTo, e.timeInfo, e.place, e.address, e.zoneId, e.price, b(e.free), e.image, e.rating, e.status, e.submittedBy, e.createdAt]); }
export async function setEventStatus(id: string, status: Event['status']): Promise<void> { await run('UPDATE events SET status = ? WHERE id = ?', [status, id]); }
export async function deleteEventRow(id: string): Promise<void> { await run('DELETE FROM events WHERE id = ?', [id]); }
export const listReports = async (status?: Report['status']): Promise<Report[]> => ((status ? await all('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC', [status]) : await all('SELECT * FROM reports ORDER BY created_at DESC LIMIT 1000')) as Row[]).map(rowToReport);
export const countReports = async (status: Report['status']): Promise<number> => Number((await get('SELECT COUNT(*) c FROM reports WHERE status = ?', [status]) as Row).c);
export async function insertReport(r: Report): Promise<void> { await run('INSERT INTO reports (id, name, email, zone_id, subject, body, image, status, reply, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [r.id, r.name, r.email, r.zoneId, r.subject, r.body, r.image, r.status, r.reply, r.createdAt]); }
export async function updateReportRow(id: string, patch: { status?: Report['status']; reply?: string; subject?: string; body?: string }): Promise<void> { const keys = Object.keys(patch).filter((k) => patch[k as keyof typeof patch] !== undefined); if (!keys.length) return; await run(`UPDATE reports SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => patch[k as keyof typeof patch]), id]); }
export async function deleteReportRow(id: string): Promise<void> { await run('DELETE FROM reports WHERE id = ?', [id]); }

// ---------------- Job di importazione ----------------
export interface ImportJob { id: string; source: 'wxr' | 'rest'; status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled'; options: Record<string, unknown>; file: string; total: number; processed: number; imported: number; skipped: number; errors: string[]; message: string; cursor: string; createdAt: string; updatedAt: string }
const rowToJob = (r: Row): ImportJob => ({ id: String(r.id), source: r.source as ImportJob['source'], status: r.status as ImportJob['status'], options: pj<Record<string, unknown>>(r.options, {}), file: String(r.file ?? ''), total: Number(r.total ?? 0), processed: Number(r.processed ?? 0), imported: Number(r.imported ?? 0), skipped: Number(r.skipped ?? 0), errors: pj<string[]>(r.errors, []), message: String(r.message ?? ''), cursor: String(r.cursor_pos ?? ''), createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? '') });
export async function insertJob(jb: ImportJob): Promise<void> { await run('INSERT INTO import_jobs (id, source, status, options, file, total, processed, imported, skipped, errors, message, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [jb.id, jb.source, jb.status, j(jb.options), jb.file, jb.total, jb.processed, jb.imported, jb.skipped, j(jb.errors), jb.message, jb.createdAt, jb.updatedAt]); }
export async function updateJob(id: string, patch: Partial<ImportJob>): Promise<void> { const cols: Record<string, unknown> = {}; if (patch.status) cols.status = patch.status; if (patch.total !== undefined) cols.total = patch.total; if (patch.processed !== undefined) cols.processed = patch.processed; if (patch.imported !== undefined) cols.imported = patch.imported; if (patch.skipped !== undefined) cols.skipped = patch.skipped; if (patch.errors) cols.errors = j(patch.errors.slice(-200)); if (patch.message !== undefined) cols.message = patch.message; if (patch.cursor !== undefined) cols.cursor_pos = patch.cursor; cols.updated_at = new Date().toISOString(); await run(`UPDATE import_jobs SET ${Object.keys(cols).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...(Object.values(cols)), id]); }
export const findJob = async (id: string): Promise<ImportJob | undefined> => { const r = await get('SELECT * FROM import_jobs WHERE id = ?', [id]) as Row | undefined; return r ? rowToJob(r) : undefined; };
export const listJobs = async (limit = 20): Promise<ImportJob[]> => (await all('SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map(rowToJob);

export async function batchRaw(stmts: Stmt[]): Promise<void> { await batch(stmts); }

/** Inserimento massivo: un solo INSERT multi-riga per gli articoli e uno per i tag (pochi round-trip verso il database remoto). */
export async function bulkUpsertArticles(list: { a: Article; wpId?: string }[]): Promise<void> {
  if (!list.length) return;
  const COLS = 35;
  const cols = 'id, slug, kicker, title, subtitle, excerpt, content, cover_image, cover_caption, category_id, author_id, zone_id, address, status, format, video_url, gallery, live_updates, live_active, featured, breaking, sponsored, allow_comments, seo, tag_ids, views, published_at, scheduled_at, created_at, updated_at, seo_score, seo_report, legacy_url, wp_id, search_text';
  const stmts: Stmt[] = [];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    const args: unknown[] = []; const rows: string[] = [];
    chunk.forEach(({ a, wpId }) => { const st = articleStmts(a, { wpId })[0]; args.push(...st.args); rows.push(`(${Array.from({ length: COLS }, () => '?').join(',')})`); });
    stmts.push({ sql: `INSERT INTO articles (${cols}) VALUES ${rows.join(',')} ON CONFLICT (id) DO UPDATE SET ${UPSERT_ARTICLE.split('ON CONFLICT (id) DO UPDATE SET ')[1]}`, args });
    const ids = chunk.map((x) => x.a.id);
    stmts.push({ sql: `DELETE FROM article_tags WHERE article_id IN (${ids.map(() => '?').join(',')})`, args: ids });
    const tagArgs: unknown[] = []; const tagRows: string[] = [];
    chunk.forEach(({ a }) => a.tagIds.forEach((t) => { tagArgs.push(a.id, t); tagRows.push('(?,?)'); }));
    if (tagRows.length) stmts.push({ sql: `INSERT INTO article_tags (article_id, tag_id) VALUES ${tagRows.join(',')} ON CONFLICT DO NOTHING`, args: tagArgs });
  }
  await batch(stmts);
}

// ---------------- Seed ----------------
export function seedStatements(d: Database): Stmt[] {
  const stmts: Stmt[] = [];
  d.categories.forEach((c) => stmts.push({ sql: 'INSERT INTO categories (id, slug, name, kind, color, description, ord, show_in_menu, show_on_home) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [c.id, c.slug, c.name, c.kind, c.color, c.description, c.order, b(c.showInMenu), b(c.showOnHome)] }));
  d.tags.forEach((t) => stmts.push({ sql: 'INSERT INTO tags (id, slug, name) VALUES (?,?,?) ON CONFLICT (id) DO NOTHING', args: [t.id, t.slug, t.name] }));
  d.users.forEach((u) => stmts.push({ sql: 'INSERT INTO users (id, name, email, role, avatar, bio, active, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [u.id, u.name, u.email, u.role, u.avatar, u.bio, b(u.active), u.createdAt] }));
  d.zones.forEach((z) => stmts.push({ sql: 'INSERT INTO zones (id, slug, name, kind) VALUES (?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [z.id, z.slug, z.name, z.kind] }));
  d.articles.forEach((a) => stmts.push(...articleStmts(a)));
  d.comments.forEach((c) => stmts.push({ sql: 'INSERT INTO comments (id, article_id, author_name, email, body, status, created_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [c.id, c.articleId, c.authorName, c.email, c.body, c.status, c.createdAt] }));
  d.media.forEach((m) => stmts.push({ sql: 'INSERT INTO media (id, name, url, alt, type, size, uploaded_by, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [m.id, m.name, m.url, m.alt, m.type, m.size, m.uploadedBy, m.createdAt] }));
  d.subscribers.forEach((x) => stmts.push({ sql: 'INSERT INTO subscribers (id, email, created_at) VALUES (?,?,?) ON CONFLICT (email) DO NOTHING', args: [x.id, x.email, x.createdAt] }));
  stmts.push({ sql: "INSERT INTO settings (key, value) VALUES ('site', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", args: [JSON.stringify(d.settings)] });
  d.activity.forEach((e) => stmts.push({ sql: 'INSERT INTO activity (id, user_id, action, target, created_at) VALUES (?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [e.id, e.userId, e.action, e.target, e.createdAt] }));
  d.events.forEach((e) => stmts.push({ sql: 'INSERT INTO events (id, slug, title, description, type, date_from, date_to, time_info, place, address, zone_id, price, free, image, rating, status, submitted_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [e.id, e.slug, e.title, e.description, e.type, e.dateFrom, e.dateTo, e.timeInfo, e.place, e.address, e.zoneId, e.price, b(e.free), e.image, e.rating, e.status, e.submittedBy, e.createdAt] }));
  d.reports.forEach((r) => stmts.push({ sql: 'INSERT INTO reports (id, name, email, zone_id, subject, body, image, status, reply, created_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING', args: [r.id, r.name, r.email, r.zoneId, r.subject, r.body, r.image, r.status, r.reply, r.createdAt] }));
  return stmts;
}
export async function insertSeed(d: Database): Promise<void> { const stmts = seedStatements(d); for (let i = 0; i < stmts.length; i += 400) await batch(stmts.slice(i, i + 400)); }
