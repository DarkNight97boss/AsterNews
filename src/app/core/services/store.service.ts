import { Injectable, computed, effect, signal } from '@angular/core';
import { ActivityEntry, Article, ArticleStatus, Category, Comment, Database, MediaItem, SiteSettings, Subscriber, Tag, User } from '../models';
import { buildSeed } from '../seed';
import { slugify, uid } from '../utils';

const KEY = 'aster-news-db-v1';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly db = signal<Database>(this.load());

  readonly categories = computed(() => [...this.db().categories].sort((a, b) => a.order - b.order));
  readonly tags = computed(() => [...this.db().tags].sort((a, b) => a.name.localeCompare(b.name)));
  readonly users = computed(() => this.db().users);
  readonly articles = computed(() => this.db().articles);
  readonly comments = computed(() => this.db().comments);
  readonly media = computed(() => this.db().media);
  readonly subscribers = computed(() => this.db().subscribers);
  readonly settings = computed(() => this.db().settings);
  readonly activity = computed(() => [...this.db().activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));

  /** Published articles visible to the public, newest first. Scheduled articles whose time has come are included. */
  readonly published = computed(() => {
    const now = new Date().toISOString();
    return this.db().articles
      .filter((a) => a.status === 'published' || (a.status === 'scheduled' && a.scheduledAt && a.scheduledAt <= now))
      .map((a) => (a.status === 'scheduled' ? { ...a, publishedAt: a.scheduledAt } : a))
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
  });

  readonly breaking = computed(() => this.published().filter((a) => a.breaking));
  readonly featured = computed(() => this.published().filter((a) => a.featured));
  readonly mostRead = computed(() => [...this.published()].sort((a, b) => b.views - a.views).slice(0, 8));
  readonly liveArticles = computed(() => this.published().filter((a) => a.format === 'live' && a.liveActive));

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.db()));
      } catch {
        /* storage unavailable */
      }
    });
  }

  private load(): Database {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Database;
        if (parsed.version === 1) return parsed;
      }
    } catch {
      /* ignore */
    }
    return buildSeed();
  }

  resetDemo(): void {
    this.db.set(buildSeed());
  }

  private patch(fn: (d: Database) => Partial<Database>): void {
    this.db.update((d) => ({ ...d, ...fn(d) }));
  }

  // ---------- lookups ----------
  category(id: string | null | undefined): Category | undefined {
    return this.db().categories.find((c) => c.id === id);
  }
  categoryBySlug(slug: string): Category | undefined {
    return this.db().categories.find((c) => c.slug === slug);
  }
  tag(id: string): Tag | undefined {
    return this.db().tags.find((t) => t.id === id);
  }
  tagBySlug(slug: string): Tag | undefined {
    return this.db().tags.find((t) => t.slug === slug);
  }
  user(id: string | null | undefined): User | undefined {
    return this.db().users.find((u) => u.id === id);
  }
  article(id: string): Article | undefined {
    return this.db().articles.find((a) => a.id === id);
  }
  articleBySlug(slug: string): Article | undefined {
    return this.published().find((a) => a.slug === slug);
  }
  articlesByCategory(categoryId: string): Article[] {
    return this.published().filter((a) => a.categoryId === categoryId);
  }
  articlesByTag(tagId: string): Article[] {
    return this.published().filter((a) => a.tagIds.includes(tagId));
  }
  articlesByAuthor(userId: string): Article[] {
    return this.published().filter((a) => a.authorId === userId);
  }
  related(article: Article, n = 4): Article[] {
    const score = (a: Article) => (a.categoryId === article.categoryId ? 2 : 0) + a.tagIds.filter((t) => article.tagIds.includes(t)).length;
    return this.published()
      .filter((a) => a.id !== article.id)
      .map((a) => ({ a, s: score(a) }))
      .sort((x, y) => y.s - x.s || (y.a.publishedAt ?? '').localeCompare(x.a.publishedAt ?? ''))
      .slice(0, n)
      .map((x) => x.a);
  }
  search(q: string): Article[] {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return this.published().filter((a) => [a.title, a.subtitle, a.excerpt, a.kicker, a.content].join(' ').toLowerCase().includes(t));
  }
  approvedComments(articleId: string): Comment[] {
    return this.db().comments.filter((c) => c.articleId === articleId && c.status === 'approved').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  countByStatus(): Record<ArticleStatus, number> {
    const r: Record<ArticleStatus, number> = { draft: 0, review: 0, scheduled: 0, published: 0, archived: 0 };
    this.db().articles.forEach((a) => r[a.status]++);
    return r;
  }

  // ---------- articles ----------
  newArticle(authorId: string): Article {
    const now = new Date().toISOString();
    return {
      id: uid('a'), slug: '', kicker: '', title: '', subtitle: '', excerpt: '', content: '', coverImage: '', coverCaption: '',
      categoryId: this.categories()[0]?.id ?? '', tagIds: [], authorId, status: 'draft', format: 'standard', videoUrl: '', gallery: [],
      liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true,
      seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now,
    };
  }

  uniqueSlug(base: string, excludeId: string): string {
    let slug = slugify(base) || 'articolo';
    let n = 2;
    const taken = (s: string) => this.db().articles.some((a) => a.slug === s && a.id !== excludeId);
    const root = slug;
    while (taken(slug)) slug = `${root}-${n++}`;
    return slug;
  }

  saveArticle(article: Article, actorId: string): Article {
    const now = new Date().toISOString();
    const a: Article = { ...article, slug: this.uniqueSlug(article.slug || article.title, article.id), updatedAt: now };
    if (a.status === 'published' && !a.publishedAt) a.publishedAt = now;
    if (a.status !== 'scheduled') a.scheduledAt = null;
    if (!a.seo.title) a.seo.title = a.title;
    if (!a.seo.description) a.seo.description = a.excerpt || a.subtitle;
    this.patch((d) => {
      const exists = d.articles.some((x) => x.id === a.id);
      return { articles: exists ? d.articles.map((x) => (x.id === a.id ? a : x)) : [a, ...d.articles] };
    });
    this.log(actorId, a.status === 'published' ? 'ha pubblicato' : 'ha salvato', a.title);
    return a;
  }

  setArticleStatus(id: string, status: ArticleStatus, actorId: string): void {
    const now = new Date().toISOString();
    this.patch((d) => ({
      articles: d.articles.map((a) => (a.id === id ? { ...a, status, updatedAt: now, publishedAt: status === 'published' && !a.publishedAt ? now : a.publishedAt } : a)),
    }));
    const a = this.article(id);
    if (a) this.log(actorId, `ha impostato lo stato "${status}" per`, a.title);
  }

  deleteArticle(id: string, actorId: string): void {
    const a = this.article(id);
    this.patch((d) => ({ articles: d.articles.filter((x) => x.id !== id), comments: d.comments.filter((c) => c.articleId !== id) }));
    if (a) this.log(actorId, 'ha eliminato', a.title);
  }

  duplicateArticle(id: string, actorId: string): Article | undefined {
    const a = this.article(id);
    if (!a) return undefined;
    const now = new Date().toISOString();
    const copy: Article = { ...a, id: uid('a'), title: a.title + ' (copia)', slug: this.uniqueSlug(a.slug + '-copia', ''), status: 'draft', publishedAt: null, scheduledAt: null, views: 0, createdAt: now, updatedAt: now, liveUpdates: [...a.liveUpdates], tagIds: [...a.tagIds], gallery: [...a.gallery], seo: { ...a.seo } };
    this.patch((d) => ({ articles: [copy, ...d.articles] }));
    this.log(actorId, 'ha duplicato', a.title);
    return copy;
  }

  incrementViews(id: string): void {
    this.patch((d) => ({ articles: d.articles.map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a)) }));
  }

  // ---------- categories / tags ----------
  saveCategory(c: Category): void {
    const cat = { ...c, slug: slugify(c.slug || c.name) };
    this.patch((d) => ({ categories: d.categories.some((x) => x.id === cat.id) ? d.categories.map((x) => (x.id === cat.id ? cat : x)) : [...d.categories, cat] }));
  }
  deleteCategory(id: string): void {
    const fallback = this.categories().find((c) => c.id !== id)?.id ?? '';
    this.patch((d) => ({
      categories: d.categories.filter((c) => c.id !== id),
      articles: d.articles.map((a) => (a.categoryId === id ? { ...a, categoryId: fallback } : a)),
      settings: { ...d.settings, homeSections: d.settings.homeSections.filter((s) => s !== id) },
    }));
  }
  saveTag(t: Tag): void {
    const tag = { ...t, slug: slugify(t.slug || t.name) };
    this.patch((d) => ({ tags: d.tags.some((x) => x.id === tag.id) ? d.tags.map((x) => (x.id === tag.id ? tag : x)) : [...d.tags, tag] }));
  }
  ensureTag(name: string): Tag {
    const slug = slugify(name);
    const existing = this.db().tags.find((t) => t.slug === slug);
    if (existing) return existing;
    const tag: Tag = { id: uid('t'), slug, name: name.trim() };
    this.patch((d) => ({ tags: [...d.tags, tag] }));
    return tag;
  }
  deleteTag(id: string): void {
    this.patch((d) => ({ tags: d.tags.filter((t) => t.id !== id), articles: d.articles.map((a) => ({ ...a, tagIds: a.tagIds.filter((t) => t !== id) })) }));
  }

  // ---------- users ----------
  saveUser(u: User): void {
    this.patch((d) => ({ users: d.users.some((x) => x.id === u.id) ? d.users.map((x) => (x.id === u.id ? u : x)) : [...d.users, u] }));
  }
  deleteUser(id: string): void {
    this.patch((d) => ({ users: d.users.filter((u) => u.id !== id) }));
  }

  // ---------- comments ----------
  addComment(c: Omit<Comment, 'id' | 'createdAt' | 'status'>): Comment {
    const comment: Comment = { ...c, id: uid('cm'), createdAt: new Date().toISOString(), status: this.settings().commentsModeration ? 'pending' : 'approved' };
    this.patch((d) => ({ comments: [comment, ...d.comments] }));
    return comment;
  }
  setCommentStatus(id: string, status: Comment['status']): void {
    this.patch((d) => ({ comments: d.comments.map((c) => (c.id === id ? { ...c, status } : c)) }));
  }
  deleteComment(id: string): void {
    this.patch((d) => ({ comments: d.comments.filter((c) => c.id !== id) }));
  }

  // ---------- media ----------
  addMedia(m: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem {
    const item: MediaItem = { ...m, id: uid('m'), createdAt: new Date().toISOString() };
    this.patch((d) => ({ media: [item, ...d.media] }));
    return item;
  }
  updateMedia(m: MediaItem): void {
    this.patch((d) => ({ media: d.media.map((x) => (x.id === m.id ? m : x)) }));
  }
  deleteMedia(id: string): void {
    this.patch((d) => ({ media: d.media.filter((m) => m.id !== id) }));
  }

  // ---------- misc ----------
  subscribe(email: string): boolean {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return false;
    if (this.db().subscribers.some((s) => s.email === e)) return true;
    const s: Subscriber = { id: uid('s'), email: e, createdAt: new Date().toISOString() };
    this.patch((d) => ({ subscribers: [s, ...d.subscribers] }));
    return true;
  }
  removeSubscriber(id: string): void {
    this.patch((d) => ({ subscribers: d.subscribers.filter((s) => s.id !== id) }));
  }
  saveSettings(s: SiteSettings): void {
    this.patch(() => ({ settings: { ...s } }));
  }
  private log(userId: string, action: string, target: string): void {
    const entry: ActivityEntry = { id: uid('ac'), userId, action, target, createdAt: new Date().toISOString() };
    this.patch((d) => ({ activity: [entry, ...d.activity].slice(0, 100) }));
  }
  exportJson(): string {
    return JSON.stringify(this.db(), null, 2);
  }
}
