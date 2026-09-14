'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, DEMO_PASSWORD, getCurrentUser, requirePermission, requireUser, SESSION_COOKIE } from './auth';
import { getDb, mutate, resetDb } from './db';
import { Article, ArticleStatus, Category, Comment, CommentStatus, Event, MediaItem, Report, SiteSettings, Tag, User, Zone } from './models';
import { can, canEdit } from './permissions';
import { article as findArticle, getCategories } from './queries';
import { slugify, uid } from './utils';
import { PREVIEW_COOKIE } from './theme-server';
import type { ThemeSettings } from './themes';

export type ActionResult = { ok: boolean; message?: string; id?: string };

const ok = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
const fail = (message: string): ActionResult => ({ ok: false, message });

function refresh(): void {
  revalidatePath('/', 'layout');
}

function log(userId: string, action: string, target: string): void {
  mutate((d) => ({ activity: [{ id: uid('ac'), userId, action, target, createdAt: new Date().toISOString() }, ...d.activity].slice(0, 100) }));
}

// ---------------- Auth ----------------
export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '') || '/admin';
  const u = getDb().users.find((x) => x.email.toLowerCase() === email);
  if (!u) return fail('Nessun utente con questa email.');
  if (!u.active) return fail('Account disattivato. Contatta un amministratore.');
  if (password !== DEMO_PASSWORD) return fail('Password errata.');
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(u.id), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7, secure: process.env.NODE_ENV === 'production' });
  redirect(redirectTo.startsWith('/') ? redirectTo : '/admin');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

// ---------------- Articoli ----------------
function uniqueSlug(base: string, excludeId: string): string {
  const root = slugify(base) || 'articolo';
  let slug = root;
  let n = 2;
  while (getDb().articles.some((a) => a.slug === slug && a.id !== excludeId)) slug = `${root}-${n++}`;
  return slug;
}

export async function saveArticleAction(input: Article, status: ArticleStatus): Promise<ActionResult> {
  const u = await requireUser();
  const existing = findArticle(input.id);
  if (existing && !canEdit(u, existing)) return fail('Non puoi modificare questo articolo.');
  if (!existing && !can(u, 'article.create')) return fail('Non puoi creare articoli.');
  if (!input.title.trim()) return fail('Il titolo è obbligatorio.');
  if (!can(u, 'article.edit.any')) input.authorId = existing?.authorId ?? u.id;
  if ((status === 'published' || status === 'scheduled' || status === 'archived') && !can(u, 'article.publish')) status = 'review';

  const now = new Date().toISOString();
  const a: Article = { ...input, status, slug: uniqueSlug(input.slug || input.title, input.id), updatedAt: now, excerpt: input.excerpt || input.subtitle };
  if (status === 'scheduled') {
    if (!a.scheduledAt) return fail('Imposta data e ora di programmazione.');
    if (a.scheduledAt <= now) { a.status = 'published'; a.scheduledAt = null; }
  } else a.scheduledAt = null;
  if (a.status === 'published' && !a.publishedAt) a.publishedAt = now;
  if (!a.seo.title) a.seo.title = a.title;
  if (!a.seo.description) a.seo.description = a.excerpt || a.subtitle;
  if (!existing) a.createdAt = now;

  mutate((d) => ({ articles: existing ? d.articles.map((x) => (x.id === a.id ? a : x)) : [a, ...d.articles] }));
  log(u.id, a.status === 'published' ? 'ha pubblicato' : 'ha salvato', a.title);
  refresh();
  const msg = a.status === 'published' ? 'Articolo pubblicato!' : a.status === 'scheduled' ? 'Articolo programmato.' : a.status === 'review' ? 'Inviato in revisione.' : 'Bozza salvata.';
  return ok(msg, a.id);
}

export async function setArticleStatusAction(id: string, status: ArticleStatus): Promise<ActionResult> {
  const u = await requireUser();
  const a = findArticle(id);
  if (!a || !canEdit(u, a)) return fail('Operazione non consentita.');
  if (status !== 'draft' && status !== 'review' && !can(u, 'article.publish')) return fail('Non hai il permesso di pubblicare.');
  const now = new Date().toISOString();
  mutate((d) => ({ articles: d.articles.map((x) => (x.id === id ? { ...x, status, updatedAt: now, publishedAt: status === 'published' && !x.publishedAt ? now : x.publishedAt } : x)) }));
  log(u.id, `ha impostato lo stato "${status}" per`, a.title);
  refresh();
  return ok('Stato aggiornato.');
}

export async function bulkStatusAction(ids: string[], status: ArticleStatus): Promise<ActionResult> {
  let n = 0;
  for (const id of ids) if ((await setArticleStatusAction(id, status)).ok) n++;
  return ok(`${n} articoli aggiornati.`);
}

export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const u = await requireUser();
  const a = findArticle(id);
  if (!a) return fail('Articolo non trovato.');
  const allowed = can(u, 'article.delete') || (a.authorId === u.id && a.status === 'draft');
  if (!allowed) return fail('Non puoi eliminare questo articolo.');
  mutate((d) => ({ articles: d.articles.filter((x) => x.id !== id), comments: d.comments.filter((c) => c.articleId !== id) }));
  log(u.id, 'ha eliminato', a.title);
  refresh();
  return ok('Articolo eliminato.');
}

export async function bulkDeleteAction(ids: string[]): Promise<ActionResult> {
  let n = 0;
  for (const id of ids) if ((await deleteArticleAction(id)).ok) n++;
  return ok(`${n} articoli eliminati.`);
}

export async function duplicateArticleAction(id: string): Promise<ActionResult> {
  const u = await requirePermission('article.create');
  const a = findArticle(id);
  if (!a) return fail('Articolo non trovato.');
  const now = new Date().toISOString();
  const copy: Article = { ...structuredClone(a), id: uid('a'), title: a.title + ' (copia)', slug: uniqueSlug(a.slug + '-copia', ''), status: 'draft', publishedAt: null, scheduledAt: null, views: 0, createdAt: now, updatedAt: now, authorId: can(u, 'article.edit.any') ? a.authorId : u.id };
  mutate((d) => ({ articles: [copy, ...d.articles] }));
  log(u.id, 'ha duplicato', a.title);
  refresh();
  return ok('Articolo duplicato.', copy.id);
}

export async function incrementViewsAction(id: string): Promise<void> {
  mutate((d) => ({ articles: d.articles.map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a)) }));
}

// ---------------- Categorie / Tag ----------------
export async function saveCategoryAction(c: Category): Promise<ActionResult> {
  await requirePermission('category.manage');
  if (!c.name.trim()) return fail('Il nome è obbligatorio.');
  const cat: Category = { ...c, id: c.id || uid('c'), slug: slugify(c.slug || c.name) };
  mutate((d) => ({ categories: d.categories.some((x) => x.id === cat.id) ? d.categories.map((x) => (x.id === cat.id ? cat : x)) : [...d.categories, cat] }));
  refresh();
  return ok('Categoria salvata.', cat.id);
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requirePermission('category.manage');
  const cats = getCategories();
  if (cats.length <= 1) return fail('Deve esistere almeno una categoria.');
  const fallback = cats.find((c) => c.id !== id)?.id ?? '';
  mutate((d) => ({
    categories: d.categories.filter((c) => c.id !== id),
    articles: d.articles.map((a) => (a.categoryId === id ? { ...a, categoryId: fallback } : a)),
    settings: { ...d.settings, homeSections: d.settings.homeSections.filter((s) => s !== id) },
  }));
  refresh();
  return ok('Categoria eliminata.');
}

export async function moveCategoryAction(id: string, dir: -1 | 1): Promise<ActionResult> {
  await requirePermission('category.manage');
  const list = getCategories();
  const i = list.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return ok();
  const a = list[i], b = list[j];
  mutate((d) => ({ categories: d.categories.map((c) => (c.id === a.id ? { ...c, order: b.order } : c.id === b.id ? { ...c, order: a.order } : c)) }));
  refresh();
  return ok();
}

export async function saveTagAction(t: Tag): Promise<ActionResult> {
  await requirePermission('tag.manage');
  if (!t.name.trim()) return fail('Il nome è obbligatorio.');
  const tag: Tag = { ...t, id: t.id || uid('t'), slug: slugify(t.slug || t.name) };
  mutate((d) => ({ tags: d.tags.some((x) => x.id === tag.id) ? d.tags.map((x) => (x.id === tag.id ? tag : x)) : [...d.tags, tag] }));
  refresh();
  return ok('Tag salvato.', tag.id);
}

export async function ensureTagAction(name: string): Promise<Tag | null> {
  const u = await requireUser();
  if (!can(u, 'tag.manage') && !can(u, 'article.create')) return null;
  const slug = slugify(name);
  if (!slug) return null;
  const existing = getDb().tags.find((t) => t.slug === slug);
  if (existing) return existing;
  const tag: Tag = { id: uid('t'), slug, name: name.trim() };
  mutate((d) => ({ tags: [...d.tags, tag] }));
  return tag;
}

export async function deleteTagAction(id: string): Promise<ActionResult> {
  await requirePermission('tag.manage');
  mutate((d) => ({ tags: d.tags.filter((t) => t.id !== id), articles: d.articles.map((a) => ({ ...a, tagIds: a.tagIds.filter((t) => t !== id) })) }));
  refresh();
  return ok('Tag eliminato.');
}

// ---------------- Media ----------------
export async function addMediaAction(m: { name: string; url: string; alt: string; size: number }): Promise<MediaItem | null> {
  const u = await requirePermission('media.manage');
  if (!m.url) return null;
  const item: MediaItem = { ...m, id: uid('m'), type: 'image', uploadedBy: u.id, createdAt: new Date().toISOString() };
  mutate((d) => ({ media: [item, ...d.media] }));
  refresh();
  return item;
}

export async function updateMediaAction(m: MediaItem): Promise<ActionResult> {
  await requirePermission('media.manage');
  mutate((d) => ({ media: d.media.map((x) => (x.id === m.id ? { ...x, name: m.name, alt: m.alt } : x)) }));
  refresh();
  return ok('Salvato.');
}

export async function deleteMediaAction(id: string): Promise<ActionResult> {
  await requirePermission('media.manage');
  mutate((d) => ({ media: d.media.filter((m) => m.id !== id) }));
  refresh();
  return ok('File eliminato.');
}

// ---------------- Commenti ----------------
export async function setCommentStatusAction(id: string, status: CommentStatus): Promise<ActionResult> {
  await requirePermission('comment.moderate');
  mutate((d) => ({ comments: d.comments.map((c) => (c.id === id ? { ...c, status } : c)) }));
  refresh();
  return ok('Commento aggiornato.');
}

export async function deleteCommentAction(id: string): Promise<ActionResult> {
  await requirePermission('comment.moderate');
  mutate((d) => ({ comments: d.comments.filter((c) => c.id !== id) }));
  refresh();
  return ok('Commento eliminato.');
}

export async function addCommentAction(input: { articleId: string; authorName: string; email: string; body: string }): Promise<ActionResult> {
  const a = findArticle(input.articleId);
  if (!a || !a.allowComments) return fail('Commenti non disponibili.');
  if (!input.authorName.trim() || !input.body.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return fail('Compila tutti i campi correttamente.');
  const moderated = getDb().settings.commentsModeration;
  const c: Comment = { id: uid('cm'), articleId: a.id, authorName: input.authorName.trim().slice(0, 60), email: input.email.trim(), body: input.body.trim().slice(0, 2000), status: moderated ? 'pending' : 'approved', createdAt: new Date().toISOString() };
  mutate((d) => ({ comments: [c, ...d.comments] }));
  refresh();
  return ok(moderated ? 'Grazie! Il commento sarà pubblicato dopo la moderazione.' : 'Commento pubblicato.');
}

// ---------------- Utenti ----------------
export async function saveUserAction(u: User): Promise<ActionResult> {
  const me = await requirePermission('user.manage');
  if (!u.name.trim() || !u.email.trim()) return fail('Nome ed email sono obbligatori.');
  if (getDb().users.some((x) => x.email.toLowerCase() === u.email.toLowerCase() && x.id !== u.id)) return fail('Email già in uso.');
  if (u.id === me.id && !u.active) return fail('Non puoi disattivare il tuo account.');
  const user: User = { ...u, id: u.id || uid('u'), avatar: u.avatar || `https://picsum.photos/seed/${slugify(u.name)}/200/200`, createdAt: u.createdAt || new Date().toISOString() };
  mutate((d) => ({ users: d.users.some((x) => x.id === user.id) ? d.users.map((x) => (x.id === user.id ? user : x)) : [...d.users, user] }));
  refresh();
  return ok('Utente salvato.', user.id);
}

export async function deleteUserAction(id: string): Promise<ActionResult> {
  const me = await requirePermission('user.manage');
  if (id === me.id) return fail('Non puoi eliminare te stesso.');
  if (getDb().articles.some((a) => a.authorId === id)) return fail("L'utente ha articoli associati: disattivalo invece di eliminarlo.");
  mutate((d) => ({ users: d.users.filter((u) => u.id !== id) }));
  refresh();
  return ok('Utente eliminato.');
}

// ---------------- Impostazioni / newsletter ----------------
export async function saveSettingsAction(s: SiteSettings): Promise<ActionResult> {
  await requirePermission('settings.manage');
  mutate(() => ({ settings: { ...s, ticker: s.ticker.filter((t) => t.trim()), articlesPerPage: Math.min(48, Math.max(4, Number(s.articlesPerPage) || 12)) } }));
  refresh();
  return ok('Impostazioni salvate.');
}

export async function resetDemoAction(): Promise<ActionResult> {
  await requirePermission('settings.manage');
  resetDb();
  refresh();
  return ok('Dati demo ripristinati.');
}

export async function exportJsonAction(): Promise<string> {
  await requirePermission('settings.manage');
  return JSON.stringify(getDb(), null, 2);
}

export async function subscribeAction(email: string): Promise<ActionResult> {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return fail('Inserisci un indirizzo email valido.');
  if (!getDb().subscribers.some((s) => s.email === e)) mutate((d) => ({ subscribers: [{ id: uid('s'), email: e, createdAt: new Date().toISOString() }, ...d.subscribers] }));
  return ok('Iscrizione completata. Benvenuto!');
}

export async function removeSubscriberAction(id: string): Promise<ActionResult> {
  await requirePermission('comment.moderate');
  mutate((d) => ({ subscribers: d.subscribers.filter((s) => s.id !== id) }));
  refresh();
  return ok('Iscritto rimosso.');
}

export async function currentUserAction(): Promise<User | null> {
  return getCurrentUser();
}

// ---------------- Zone ----------------
export async function saveZoneAction(z: Zone): Promise<ActionResult> {
  await requirePermission('category.manage');
  if (!z.name.trim()) return fail('Il nome è obbligatorio.');
  const zone: Zone = { ...z, id: z.id || uid('z'), slug: slugify(z.slug || z.name), name: z.name.trim() };
  mutate((d) => ({ zones: d.zones.some((x) => x.id === zone.id) ? d.zones.map((x) => (x.id === zone.id ? zone : x)) : [...d.zones, zone] }));
  refresh();
  return ok('Zona salvata.', zone.id);
}

export async function deleteZoneAction(id: string): Promise<ActionResult> {
  await requirePermission('category.manage');
  mutate((d) => ({ zones: d.zones.filter((z) => z.id !== id), articles: d.articles.map((a) => (a.zoneId === id ? { ...a, zoneId: '' } : a)), events: d.events.map((e) => (e.zoneId === id ? { ...e, zoneId: '' } : e)) }));
  refresh();
  return ok('Zona eliminata.');
}

// ---------------- Eventi ----------------
function uniqueEventSlug(base: string, excludeId: string): string {
  const root = slugify(base) || 'evento';
  let slug = root;
  let n = 2;
  while (getDb().events.some((e) => e.slug === slug && e.id !== excludeId)) slug = `${root}-${n++}`;
  return slug;
}

export async function saveEventAction(e: Event): Promise<ActionResult> {
  await requirePermission('article.publish');
  if (!e.title.trim() || !e.dateFrom) return fail('Titolo e data di inizio sono obbligatori.');
  const event: Event = { ...e, id: e.id || uid('e'), slug: uniqueEventSlug(e.slug || e.title, e.id), createdAt: e.createdAt || new Date().toISOString(), rating: Math.max(0, Math.min(5, Number(e.rating) || 0)) };
  if (event.dateTo && event.dateTo < event.dateFrom) event.dateTo = event.dateFrom;
  mutate((d) => ({ events: d.events.some((x) => x.id === event.id) ? d.events.map((x) => (x.id === event.id ? event : x)) : [event, ...d.events] }));
  refresh();
  return ok('Evento salvato.', event.id);
}

export async function setEventStatusAction(id: string, status: Event['status']): Promise<ActionResult> {
  await requirePermission('article.publish');
  mutate((d) => ({ events: d.events.map((e) => (e.id === id ? { ...e, status } : e)) }));
  refresh();
  return ok('Evento aggiornato.');
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  await requirePermission('article.delete');
  mutate((d) => ({ events: d.events.filter((e) => e.id !== id) }));
  refresh();
  return ok('Evento eliminato.');
}

/** Segnalazione evento da parte dei lettori: entra in coda di approvazione. */
export async function submitEventAction(input: { title: string; type: Event['type']; dateFrom: string; dateTo: string; timeInfo: string; place: string; address: string; zoneId: string; price: string; free: boolean; description: string; email: string }): Promise<ActionResult> {
  if (!input.title.trim() || !input.dateFrom || !input.place.trim()) return fail('Titolo, data e luogo sono obbligatori.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return fail('Inserisci un indirizzo email valido.');
  const event: Event = {
    id: uid('e'), slug: uniqueEventSlug(input.title, ''), title: input.title.trim().slice(0, 140), description: `<p>${input.description.trim().slice(0, 3000).replace(/</g, '&lt;')}</p>`,
    type: input.type, dateFrom: input.dateFrom, dateTo: input.dateTo || null, timeInfo: input.timeInfo.slice(0, 60), place: input.place.trim().slice(0, 120), address: input.address.slice(0, 120), zoneId: input.zoneId,
    price: input.free ? '' : input.price.slice(0, 60), free: input.free, image: '', rating: 0, status: 'pending', submittedBy: input.email.trim(), createdAt: new Date().toISOString(),
  };
  mutate((d) => ({ events: [event, ...d.events] }));
  refresh();
  return ok('Grazie! L\'evento sarà pubblicato dopo la verifica della redazione.');
}

// ---------------- Segnalazioni ----------------
export async function submitReportAction(input: { name: string; email: string; zoneId: string; subject: string; body: string; image: string }): Promise<ActionResult> {
  if (!input.name.trim() || !input.subject.trim() || !input.body.trim()) return fail('Compila nome, oggetto e descrizione.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return fail('Inserisci un indirizzo email valido.');
  const r: Report = { id: uid('r'), name: input.name.trim().slice(0, 60), email: input.email.trim(), zoneId: input.zoneId, subject: input.subject.trim().slice(0, 140), body: input.body.trim().slice(0, 3000), image: input.image.startsWith('data:image/') && input.image.length < 2_000_000 ? input.image : '', status: 'new', reply: '', createdAt: new Date().toISOString() };
  mutate((d) => ({ reports: [r, ...d.reports] }));
  refresh();
  return ok('Segnalazione inviata. La redazione la verificherà al più presto.');
}

export async function updateReportAction(id: string, patch: { status?: Report['status']; reply?: string; subject?: string; body?: string }): Promise<ActionResult> {
  await requirePermission('comment.moderate');
  mutate((d) => ({ reports: d.reports.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  refresh();
  return ok('Segnalazione aggiornata.');
}

export async function deleteReportAction(id: string): Promise<ActionResult> {
  await requirePermission('comment.moderate');
  mutate((d) => ({ reports: d.reports.filter((r) => r.id !== id) }));
  refresh();
  return ok('Segnalazione eliminata.');
}

export async function setCookieConsentAction(value: 'all' | 'necessary'): Promise<void> {
  const store = await cookies();
  store.set('cookie_consent', value, { path: '/', maxAge: 60 * 60 * 24 * 180, sameSite: 'lax' });
}

// ---------------- Temi ----------------
export async function previewThemeAction(theme: ThemeSettings): Promise<void> {
  await requirePermission('settings.manage');
  const store = await cookies();
  store.set(PREVIEW_COOKIE, JSON.stringify(theme), { path: '/', maxAge: 60 * 30, sameSite: 'lax', httpOnly: true });
  redirect('/');
}

export async function clearThemePreviewAction(): Promise<void> {
  const store = await cookies();
  store.delete(PREVIEW_COOKIE);
  redirect('/admin/impostazioni');
}

export async function applyThemeAction(theme: ThemeSettings): Promise<ActionResult> {
  await requirePermission('settings.manage');
  mutate((d) => ({ settings: { ...d.settings, theme } }));
  const store = await cookies();
  store.delete(PREVIEW_COOKIE);
  refresh();
  return ok(`Tema "${theme.preset}" applicato a tutto il sito.`);
}

export async function applyThemeFromPreviewAction(): Promise<void> {
  await requirePermission('settings.manage');
  const store = await cookies();
  const raw = store.get(PREVIEW_COOKIE)?.value;
  if (raw) {
    try { const theme = JSON.parse(raw) as ThemeSettings; mutate((d) => ({ settings: { ...d.settings, theme } })); } catch { /* ignore */ }
  }
  store.delete(PREVIEW_COOKIE);
  refresh();
  redirect('/');
}
