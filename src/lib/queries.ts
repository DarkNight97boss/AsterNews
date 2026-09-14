import 'server-only';
import { cache } from 'react';
import { getDb } from './db';
import { resolveTheme } from './themes';
import { Article, ArticleStatus, Category, Comment, Event, Report, Tag, User, Zone } from './models';

export const getCategories = cache((): Category[] => [...getDb().categories].sort((a, b) => a.order - b.order));
export const getTags = cache((): Tag[] => [...getDb().tags].sort((a, b) => a.name.localeCompare(b.name)));
export const getUsers = cache((): User[] => getDb().users);
export const getAllArticles = cache((): Article[] => getDb().articles);
export const getComments = cache((): Comment[] => getDb().comments);
export const getMedia = cache(() => getDb().media);
export const getSubscribers = cache(() => getDb().subscribers);
export const getSettings = cache(() => getDb().settings);
export const getActivity = cache(() => [...getDb().activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

/** Articoli visibili al pubblico, dal più recente. Include i programmati la cui data è passata. */
export const getPublished = cache((): Article[] => {
  const now = new Date().toISOString();
  return getDb()
    .articles.filter((a) => a.status === 'published' || (a.status === 'scheduled' && a.scheduledAt && a.scheduledAt <= now))
    .map((a) => (a.status === 'scheduled' ? { ...a, publishedAt: a.scheduledAt } : a))
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
});

export const getBreaking = () => getPublished().filter((a) => a.breaking);
export const getFeatured = () => getPublished().filter((a) => a.featured);
export const getMostRead = () => [...getPublished()].sort((a, b) => b.views - a.views).slice(0, 8);
export const getLiveArticles = () => getPublished().filter((a) => a.format === 'live' && a.liveActive);

export const category = (id: string | null | undefined) => getDb().categories.find((c) => c.id === id);
export const categoryBySlug = (slug: string) => getDb().categories.find((c) => c.slug === slug);
export const tag = (id: string) => getDb().tags.find((t) => t.id === id);
export const tagBySlug = (slug: string) => getDb().tags.find((t) => t.slug === slug);
export const user = (id: string | null | undefined) => getDb().users.find((u) => u.id === id);
export const article = (id: string) => getDb().articles.find((a) => a.id === id);
export const articleBySlug = (slug: string) => getPublished().find((a) => a.slug === slug);
export const articlesByCategory = (categoryId: string) => getPublished().filter((a) => a.categoryId === categoryId);
export const articlesByTag = (tagId: string) => getPublished().filter((a) => a.tagIds.includes(tagId));
export const articlesByAuthor = (userId: string) => getPublished().filter((a) => a.authorId === userId);
export const approvedComments = (articleId: string) =>
  getDb().comments.filter((c) => c.articleId === articleId && c.status === 'approved').sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function related(a: Article, n = 4): Article[] {
  const score = (x: Article) => (x.categoryId === a.categoryId ? 2 : 0) + x.tagIds.filter((t) => a.tagIds.includes(t)).length;
  return getPublished()
    .filter((x) => x.id !== a.id)
    .map((x) => ({ x, s: score(x) }))
    .sort((p, q) => q.s - p.s || (q.x.publishedAt ?? '').localeCompare(p.x.publishedAt ?? ''))
    .slice(0, n)
    .map((p) => p.x);
}

export function search(q: string): Article[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return getPublished().filter((a) => [a.title, a.subtitle, a.excerpt, a.kicker, a.content].join(' ').toLowerCase().includes(t));
}

export function countByStatus(): Record<ArticleStatus, number> {
  const r: Record<ArticleStatus, number> = { draft: 0, review: 0, scheduled: 0, published: 0, archived: 0 };
  getDb().articles.forEach((a) => r[a.status]++);
  return r;
}

export function articleUrl(a: Article): string {
  return `/${category(a.categoryId)?.slug ?? 'notizie'}/${a.slug}`;
}

// ---------- Zone / eventi / segnalazioni ----------
export const getZones = cache((): Zone[] => [...getDb().zones].sort((a, b) => a.name.localeCompare(b.name)));
export const zone = (id: string | null | undefined) => getDb().zones.find((z) => z.id === id);
export const zoneBySlug = (slug: string) => getDb().zones.find((z) => z.slug === slug);
export const articlesByZone = (zoneId: string) => getPublished().filter((a) => a.zoneId === zoneId);
export function zoneCounts(): Record<string, number> {
  const r: Record<string, number> = {};
  getPublished().forEach((a) => { if (a.zoneId) r[a.zoneId] = (r[a.zoneId] ?? 0) + 1; });
  return r;
}

export const getAllEvents = cache((): Event[] => getDb().events);
export const getEvents = cache((): Event[] => {
  const today = new Date().toISOString().slice(0, 10);
  return getDb().events
    .filter((e) => e.status === 'published' && (e.dateTo ?? e.dateFrom) >= today)
    .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom) || b.rating - a.rating);
});
export const eventBySlug = (slug: string) => getEvents().find((e) => e.slug === slug);
export const getReports = cache((): Report[] => [...getDb().reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
export const getPublishedReports = () => getReports().filter((r) => r.status === 'published');

export const getTheme = () => resolveTheme(getSettings().theme);
