import 'server-only';
import { cache } from 'react';
import * as repo from './repo';
import { Article, ArticleStatus, Category, Comment, Report, Tag, User, Zone } from './models';
import { resolveTheme } from './themes';
import { DEFAULT_SEO_SETTINGS, LinkTarget, RawContext, SeoContext, SeoSettings, extractKeywords, phrasesForArticle } from './seo-engine';
import { buildSeed } from './seed';
import { CACHE_TAGS, cached, setCacheSeconds } from './cache';
import { editionFilter } from './edition';
import { DEFAULT_CACHE, DEFAULT_SEARCH } from './models';

/** Tutte le letture passano di qui: query SQL indicizzate e limitate, mai liste complete in memoria. */
const promote = cache(async () => { await repo.promoteScheduled(); return true; });

const cCategories = cached('categories', () => repo.listCategories(), [CACHE_TAGS.taxonomy]);
const cTags = cached('tags', () => repo.topTags(400), [CACHE_TAGS.taxonomy]);
const cUsers = cached('users', () => repo.listUsers(), [CACHE_TAGS.taxonomy]);
const cZones = cached('zones', () => repo.listZones(), [CACHE_TAGS.taxonomy]);
const cSettings = cached('settings', async () => (await repo.getSettingsRow()) ?? buildSeed().settings, [CACHE_TAGS.settings]);
const cList = cached('articles', (f: repo.ArticleFilter, sort: repo.ArticleSort, limit: number, offset: number) => repo.listArticles(f, sort, limit, offset), [CACHE_TAGS.articles]);
const cZoneCounts = cached('zone-counts', () => repo.zoneCounts(), [CACHE_TAGS.articles]);
const cTopTags = cached('top-tags', (categoryId: string, limit: number) => repo.topTagsForCategory(categoryId, limit), [CACHE_TAGS.articles]);
export const getCategories = cache((): Promise<Category[]> => cCategories());
export const getTags = cache((): Promise<Tag[]> => cTags());
export const getUsers = cache((): Promise<User[]> => cUsers());
export const getZones = cache((): Promise<Zone[]> => cZones());
export const getSettings = cache(async () => { const s = await cSettings(); if (s.roles?.overrides) { const { setPermissionOverrides } = await import('./permissions'); setPermissionOverrides(s.roles.overrides as Record<string, string[]>); } setCacheSeconds({ ...DEFAULT_CACHE, ...(s.cache ?? {}) }.enabled ? { ...DEFAULT_CACHE, ...(s.cache ?? {}) }.seconds : 0); return s; });
const synonyms = async (): Promise<Record<string, string[]>> => { const raw = ({ ...DEFAULT_SEARCH, ...((await getSettings()).search ?? {}) }).synonyms; const out: Record<string, string[]> = {}; raw.split(/\r?\n/).forEach((l) => { const [k, v] = l.split('='); if (k && v) out[k.trim().toLowerCase()] = v.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean); }); return out; };
export const getSeoSettings = async (): Promise<SeoSettings> => ({ ...DEFAULT_SEO_SETTINGS, ...((await getSettings()).seo ?? {}) });
export const getTheme = async () => resolveTheme((await getSettings()).theme);
export const getActivity = (limit = 20) => repo.listActivity(limit);
export const getMedia = (limit = 500, q = '') => repo.listMedia(limit, q);
export const getSubscribers = () => repo.listSubscribers();
export const getComments = (status?: Comment['status']) => repo.listComments(status);

// ---------- Articoli pubblicati ----------
export const listPublished = async (f: repo.ArticleFilter, limit = 50, offset = 0, sort: repo.ArticleSort = 'published') => { await promote(); const ed = await editionFilter(); const filter: repo.ArticleFilter = { ...(ed.zoneId && !f.zoneId && !f.categoryId ? { zoneId: ed.zoneId } : {}), ...(ed.categoryIds && !f.categoryId ? { categoryIds: ed.categoryIds } : {}), ...f, status: 'published' }; return cList(filter, sort, limit, offset); };
export const getPublished = (limit = 60, offset = 0) => listPublished({}, limit, offset);
export const countPublished = async (f: repo.ArticleFilter = {}) => repo.countArticles({ ...f, status: 'published' });
export const getBreaking = (limit = 5) => listPublished({ breaking: true }, limit);
export const getFeatured = (limit = 8) => listPublished({ featured: true }, limit);
export const getMostRead = (limit = 8) => listPublished({}, limit, 0, 'views');
export const getLiveArticles = () => listPublished({ format: 'live', liveActive: true }, 5);
export const getVideos = (limit = 6) => listPublished({ format: 'video' }, limit);
export const getGalleries = (limit = 12) => listPublished({ format: 'gallery' }, limit);

export const category = async (id: string | null | undefined) => (id ? (await getCategories()).find((c) => c.id === id) : undefined);
export const categoryBySlug = async (slug: string) => (await getCategories()).find((c) => c.slug === slug);
const tagsMap = cache(async () => new Map((await getTags()).map((t) => [t.id, t])));
export const tag = async (id: string) => (await tagsMap()).get(id) ?? repo.findTag(id);
export const tagBySlug = (slug: string) => repo.findTagBySlug(slug);
export const tagsByIds = (ids: string[]) => repo.tagsByIds(ids);
export const user = async (id: string | null | undefined) => (id ? (await getUsers()).find((u) => u.id === id) : undefined);
export const zone = async (id: string | null | undefined) => (id ? (await getZones()).find((z) => z.id === id) : undefined);
export const zoneBySlug = (slug: string) => repo.findZoneBySlug(slug);
export const article = (id: string) => repo.findArticle(id);
export const articleBySlug = async (slug: string) => { await promote(); return repo.findArticleBySlug(slug, true); };
export const articlesByCategory = (categoryId: string, limit = 50, offset = 0) => listPublished({ categoryId }, limit, offset);
export const articlesByTag = (tagId: string, limit = 50, offset = 0) => listPublished({ tagId }, limit, offset);
export const articlesByAuthor = (userId: string, limit = 50, offset = 0) => listPublished({ authorId: userId }, limit, offset);
export const articlesByZone = (zoneId: string, limit = 50, offset = 0) => listPublished({ zoneId }, limit, offset);
export const approvedComments = (articleId: string) => repo.commentsForArticle(articleId);
export const related = (a: Article, n = 4) => repo.relatedArticles(a, n);
export const search = async (q: string, limit = 50, offset = 0, opts: { categoryId?: string; from?: string; to?: string } = {}) => repo.searchArticles(q, limit, offset, { ...opts, synonyms: await synonyms() });
export const suggest = (q: string) => repo.suggestTerms(q);
export const countByStatus = (f: { authorId?: string } = {}) => repo.countByStatus(f);
export const zoneCounts = cache(() => cZoneCounts());
export const categoryCounts = () => repo.categoryCounts();
export const tagCounts = () => repo.tagCounts();
export const topTagsForCategory = (categoryId: string, limit = 8) => cTopTags(categoryId, limit);
export async function articleUrl(a: Article): Promise<string> { return `/${(await category(a.categoryId))?.slug ?? 'notizie'}/${a.slug}`; }
/** Variante sincrona quando la mappa delle categorie è già disponibile. */
export function articleUrlWith(a: Article, cats: Category[]): string { return `/${cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}`; }
export const isPublic = (a: Article): boolean => a.status === 'published';

// ---------- Admin ----------
export const adminArticles = (f: repo.ArticleFilter, sort: repo.ArticleSort, dir: 'asc' | 'desc', limit: number, offset: number) => repo.listArticles(f, sort, limit, offset, dir);
export const adminCount = (f: repo.ArticleFilter) => repo.countArticles(f);
export const recentlyUpdated = (limit = 6) => repo.listArticles({}, 'updated', limit);
export const stats = async () => {
  const [views, today, seo, pendingComments, pendingEvents, newReports, subscribers, tags, media] = await Promise.all([repo.sumViews(), repo.countPublishedToday(), repo.avgSeoScore(), repo.countComments('pending'), repo.countEvents('pending'), repo.countReports('new'), repo.countSubscribers(), repo.countTags(), repo.countMedia()]);
  return { views, today, seo, pendingComments, pendingEvents, newReports, subscribers, tags, media };
};
export const weakSeo = async (limit = 5) => { const rows = await repo.listArticles({ status: 'published' }, 'published', 400); return rows.filter((a) => typeof a.seoScore === 'number' && a.seoScore < 55).sort((x, y) => (x.seoScore ?? 0) - (y.seoScore ?? 0)).slice(0, limit); };

// ---------- Zone / eventi / segnalazioni ----------
export const getAllEvents = () => repo.listAllEvents();
export const getEvents = (f: { zoneId?: string; type?: string; from?: string; to?: string } = {}, limit = 200) => repo.listEvents({ status: 'published', upcomingFrom: f.from ? undefined : new Date().toISOString().slice(0, 10), ...f }, limit);
export const eventBySlug = (slug: string) => repo.findEventBySlug(slug);
export const getReports = (status?: Report['status']) => repo.listReports(status);
export const getPublishedReports = () => repo.listReports('published');

// ---------- SEO ----------
export async function seoContext(excludeId: string, forArticle?: Pick<Article, 'tagIds' | 'categoryId'>): Promise<SeoContext> {
  const ex = excludeId ? [excludeId] : [];
  const [recent, cats, tags, settings] = await Promise.all([repo.listArticles({ status: 'published', excludeIds: ex }, 'published', 150), getCategories(), getTags(), getSettings()]);
  const sameTags = forArticle?.tagIds.length ? (await Promise.all(forArticle.tagIds.slice(0, 6).map((t) => repo.listArticles({ status: 'published', tagId: t, excludeIds: ex }, 'published', 20)))).flat() : [];
  const seen = new Set<string>();
  const pool = [...sameTags, ...recent].filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  const tmap = new Map(tags.map((t) => [t.id, t.name]));
  const linkTargets: LinkTarget[] = pool.map((a) => ({ id: a.id, title: a.title, url: articleUrlWith(a, cats), phrases: phrasesForArticle(a, a.tagIds.map((t) => tmap.get(t) ?? '').filter(Boolean)) })).filter((t) => t.phrases.length > 0);
  return { siteName: settings.siteName, existingTitles: recent.map((a) => a.title), tags: tags.map((t) => ({ id: t.id, name: t.name })), linkTargets };
}

let profileCache: { at: number; categories: RawContext['categories'] } | null = null;
async function categoryProfiles(): Promise<RawContext['categories']> {
  if (profileCache && Date.now() - profileCache.at < 10 * 60 * 1000) return profileCache.categories;
  const tmap = new Map((await getTags()).map((t) => [t.id, t.name]));
  const categories = await Promise.all((await getCategories()).map(async (c) => {
    const freq = new Map<string, number>();
    (await repo.listArticles({ status: 'published', categoryId: c.id }, 'published', 40)).forEach((a) => {
      extractKeywords(a.title, a.kicker, a.content, 15).forEach((k, i) => k.split(' ').forEach((t) => freq.set(t, (freq.get(t) ?? 0) + (15 - i))));
      a.tagIds.forEach((id) => (tmap.get(id) ?? '').toLowerCase().split(/\s+/).forEach((t) => { if (t.length > 2) freq.set(t, (freq.get(t) ?? 0) + 30); }));
      (a.kicker || '').toLowerCase().split(/\s+/).forEach((t) => { if (t.length > 3) freq.set(t, (freq.get(t) ?? 0) + 10); });
    });
    `${c.description}`.toLowerCase().split(/[^a-zà-ú]+/).forEach((t) => { if (t.length > 3) freq.set(t, (freq.get(t) ?? 0) + 20); });
    return { id: c.id, name: c.name, kind: c.kind, terms: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([t]) => t) };
  }));
  profileCache = { at: Date.now(), categories };
  return categories;
}
export function invalidateProfiles(): void { profileCache = null; }

export async function rawContext(excludeId = ''): Promise<RawContext> {
  const [base, categories, zones, media, covers] = await Promise.all([seoContext(excludeId), categoryProfiles(), getZones(), repo.listMedia(300), repo.listArticles({ status: 'published' }, 'published', 80)]);
  return {
    ...base, categories, zones: zones.map((z) => ({ id: z.id, name: z.name })),
    media: media.filter((m) => m.type === 'image').map((m) => ({ url: m.url, name: m.name, alt: m.alt })),
    relatedCovers: covers.filter((a) => a.coverImage && a.id !== excludeId).map((a) => ({ url: a.coverImage, title: a.title, terms: extractKeywords(a.title, a.kicker, a.content, 10).flatMap((k) => k.split(' ')) })),
  };
}

/** URL WordPress → articolo importato (redirect permanenti dai vecchi link). */
export async function legacyRedirectFor(path: string): Promise<string | null> {
  const p = ('/' + path).replace(/\/{2,}/g, '/').replace(/\/+$/, '').replace(/\.html?$/, '') || '/';
  const last = p.split('/').filter(Boolean).pop() ?? '';
  const a = (await repo.findArticleByLegacy(p)) ?? (last ? await repo.findArticleBySlug(last, true) : undefined);
  return a ? articleUrl(a) : null;
}
export type { ArticleStatus };
