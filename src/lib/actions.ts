'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from './cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clientIp, getCurrentUser, requirePermission, requireUser } from './auth';
import { resetDb } from './db';
import * as repo from './repo';
import * as x from './repo-extra';
import { Article, ArticleStatus, Category, Comment, CommentStatus, Event, MediaItem, Report, SiteSettings, Tag, User, Zone } from './models';
import { can, canEdit } from './permissions';
import { getCategories, getSeoSettings, getSettings, invalidateProfiles, rawContext, seoContext } from './queries';
import { analyze, optimizeArticle, prepareArticle } from './seo-engine';
import { slugify, uid } from './utils';
import { PREVIEW_COOKIE } from './theme-server';
import type { ThemeSettings } from './themes';
import { siteUrl } from './site-url';

export type ActionResult = { ok: boolean; message?: string; id?: string };
const ok = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
const fail = (message: string): ActionResult => ({ ok: false, message });
function refresh(): void { for (const t of Object.values(CACHE_TAGS)) revalidateTag(t, 'max'); revalidatePath('/', 'layout'); }
async function log(userId: string, action: string, target: string, articleId = '', details = ''): Promise<void> { await repo.insertActivity({ id: uid('ac'), userId, action, target, articleId, details, ip: await clientIp(), createdAt: new Date().toISOString() }); }


// ---------------- Articoli ----------------
async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  const root = slugify(base) || 'articolo';
  let slug = root; let n = 2;
  while (await repo.slugExists(slug, excludeId)) slug = `${root}-${n++}`;
  return slug;
}

export async function saveArticleAction(input: Article, status: ArticleStatus): Promise<ActionResult> {
  const u = await requireUser();
  const existing = await repo.findArticle(input.id);
  if (existing && !canEdit(u, existing)) return fail('Non puoi modificare questo articolo.');
  if (!existing && !can(u, 'article.create')) return fail('Non puoi creare articoli.');
  if (!input.title.trim()) return fail('Il titolo è obbligatorio.');
  if (!can(u, 'article.edit.any')) input.authorId = existing?.authorId ?? u.id;
  if ((status === 'published' || status === 'scheduled' || status === 'archived') && !can(u, 'article.publish')) status = 'review';
  const now = new Date().toISOString();
  const seoCfg = await getSeoSettings();
  const ctx = await seoContext(input.id, input);
  let prepared = input;
  if (seoCfg.autoOptimizeOnSave) prepared = optimizeArticle(input, ctx, { fillMeta: true, links: seoCfg.autoInternalLinks, maxLinks: seoCfg.maxInternalLinks, fixImages: seoCfg.fixImages, siteUrl: siteUrl(), overwriteSlug: false }).article;
  const a: Article = { ...prepared, status, slug: await uniqueSlug(prepared.slug || prepared.title, prepared.id), updatedAt: now, excerpt: prepared.excerpt || prepared.subtitle };
  if (status === 'scheduled') {
    if (!a.scheduledAt) return fail('Imposta data e ora di programmazione.');
    if (a.scheduledAt <= now) { a.status = 'published'; a.scheduledAt = null; }
  } else a.scheduledAt = null;
  if (a.status === 'published' && !a.publishedAt) a.publishedAt = now;
  if (!a.seo.title) a.seo.title = a.title;
  if (!a.seo.description) a.seo.description = a.excerpt || a.subtitle;
  if (!existing) a.createdAt = now;
  let a2: Article;
  try { a2 = await (await import('./extensions')).runBeforeSave(a, { user: u, isNew: !existing, wasPublished: existing?.status === 'published' }); } catch (e) { return fail((e as Error).message); }
  Object.assign(a, a2);
  // Desk, fasi di approvazione e regole automatiche
  { const { workflowOf, deskFor, applyRules, canApproveStage } = await import('./workflow'); const w = workflowOf(await getSettings());
    const desk = deskFor(w, a); a.extra = { ...(a.extra ?? {}), ...(desk ? { deskId: desk.id } : {}) };
    if (w.steps.length && (a.status === 'published' || a.status === 'scheduled') && (a.extra.stage ?? 0) < w.steps.length && u.role !== 'admin') {
      // chi può approvare l'ultima fase può pubblicare direttamente; gli altri restano in revisione
      const last = w.steps.length - 1; if (!(a.extra.stage === last && canApproveStage(w, last, u, a))) { a.status = 'review'; a.scheduledAt = null; a.publishedAt = existing?.publishedAt ?? null; }
    }
    if (a.status === 'published' && existing?.status !== 'published' && w.rules.length) { const r = applyRules(w, a); Object.assign(a, r.article); if (r.social.length) (a as Article & { _ruleSocial?: string[] })._ruleSocial = r.social; }
  }
  a.seoScore = analyze(a, ctx).score;
  if (existing) await x.insertRevision({ id: uid('rv'), articleId: a.id, userId: u.id, note: `${existing.status} → ${a.status}`, data: existing, createdAt: now });
  await repo.upsertArticle(a);
  await x.deleteAutosave(a.id); await x.releaseLock(a.id, u.id);
  await log(u.id, a.status === 'published' ? 'ha pubblicato' : 'ha salvato', a.title, a.id);
  if (a.status === 'review' && existing?.status !== 'review') { const x3 = await import('./repo-extra-notify'); await x3.notifyPublishers(u, `${u.name} ha inviato in revisione «${a.title}»`, `/admin/articoli/${a.id}`); }
  { const { dispatchWebhook } = await import('./webhooks'); const cats = await getCategories(); const url = `${siteUrl()}/${cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}`; if (a.status === 'published') dispatchWebhook(existing?.status === 'published' ? 'article.updated' : 'article.published', { id: a.id, title: a.title, url, excerpt: a.excerpt, image: a.coverImage, category: cats.find((c) => c.id === a.categoryId)?.name ?? '', author: u.name }).catch(() => {}); }
  if (a.status === 'published') import('./embeddings').then((m) => m.indexArticle(a)).catch(() => {});
  if (a.status === 'published' && existing?.status !== 'published') {
    (await import('./extensions')).runAfterPublish(a, { user: u, isNew: !existing, wasPublished: false }).catch(() => {});
    { const ai = (await getSettings()).ai; if (ai?.ttsAuto && ai.ttsProvider && ai.ttsProvider !== 'none' && !a.extra?.audioUrl) (async () => { const { audioForArticle } = await import('./tts'); const r = await audioForArticle(a); const cur = await repo.findArticle(a.id); await repo.patchArticle(a.id, { extra: JSON.stringify({ ...(cur?.extra ?? {}), audioUrl: r.url, audioDuration: r.duration }) }); })().catch((e) => console.error('[tts]', (e as Error).message)); }
    const auto = await getSettings().then((s) => s.social?.autoNetworks ?? []); const soc = [...new Set([...auto, ...(((a as Article & { _ruleSocial?: string[] })._ruleSocial ?? []) as typeof auto)])];
    if (soc.length) { const { enqueue, processQueue, configuredNetworks, socialSettings } = await import('./social'); const cfg = await socialSettings(); const nets = soc.filter((n) => configuredNetworks(cfg).includes(n)); const when = a.extra?.slots?.socialAt && a.extra.slots.socialAt > now ? a.extra.slots.socialAt : null; if (nets.length) { await enqueue(a, nets, u.id, when); if (!when) processQueue(nets.length).catch(() => {}); } }
  }
  if (a.status === 'published' && a.breaking && existing?.status !== 'published') { // ultim'ora: notifica push automatica (se attiva)
    const { sendPush, pushEnabled } = await import('./push'); const s = await getSettings();
    if ((await pushEnabled()) && (s.push?.autoBreaking ?? true)) { const cats = await getCategories(); sendPush({ title: `Ultim'ora · ${s.siteName}`, body: a.title, url: `/${cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}`, image: a.coverImage || undefined, tag: a.id }).catch(() => {}); }
  }
  refresh();
  const msg = a.status === 'published' ? 'Articolo pubblicato!' : a.status === 'scheduled' ? 'Articolo programmato.' : a.status === 'review' ? (status === 'published' ? 'In revisione: serve l\'approvazione delle fasi previste dal flusso di lavoro.' : 'Inviato in revisione.') : 'Bozza salvata.';
  return ok(msg, a.id);
}

export async function setArticleStatusAction(id: string, status: ArticleStatus): Promise<ActionResult> {
  const u = await requireUser();
  const a = await repo.findArticle(id);
  if (!a || !canEdit(u, a)) return fail('Operazione non consentita.');
  if (status !== 'draft' && status !== 'review' && !can(u, 'article.publish')) return fail('Non hai il permesso di pubblicare.');
  const now = new Date().toISOString();
  await repo.patchArticle(id, { status, updated_at: now, published_at: status === 'published' && !a.publishedAt ? now : a.publishedAt });
  await log(u.id, `ha impostato lo stato "${status}" per`, a.title, a.id);
  refresh();
  return ok('Stato aggiornato.');
}
export async function bulkStatusAction(ids: string[], status: ArticleStatus): Promise<ActionResult> { let n = 0; for (const id of ids) if ((await setArticleStatusAction(id, status)).ok) n++; return ok(`${n} articoli aggiornati.`); }
export async function deleteArticleAction(id: string): Promise<ActionResult> {
  const u = await requireUser();
  const a = await repo.findArticle(id);
  if (!a) return fail('Articolo non trovato.');
  if (!(can(u, 'article.delete') || (a.authorId === u.id && a.status === 'draft'))) return fail('Non puoi eliminare questo articolo.');
  await repo.trashArticle(id);
  await log(u.id, 'ha spostato nel cestino', a.title, a.id);
  refresh();
  return ok('Articolo spostato nel cestino (recuperabile per 30 giorni).');
}
export async function bulkDeleteAction(ids: string[]): Promise<ActionResult> { let n = 0; for (const id of ids) if ((await deleteArticleAction(id)).ok) n++; return ok(`${n} articoli eliminati.`); }
export async function duplicateArticleAction(id: string): Promise<ActionResult> {
  const u = await requirePermission('article.create');
  const a = await repo.findArticle(id);
  if (!a) return fail('Articolo non trovato.');
  const now = new Date().toISOString();
  const copy: Article = { ...structuredClone(a), id: uid('a'), title: a.title + ' (copia)', slug: await uniqueSlug(a.slug + '-copia', ''), status: 'draft', publishedAt: null, scheduledAt: null, views: 0, createdAt: now, updatedAt: now, legacyUrl: undefined, authorId: can(u, 'article.edit.any') ? a.authorId : u.id };
  await repo.upsertArticle(copy);
  await log(u.id, 'ha duplicato', a.title);
  refresh();
  return ok('Articolo duplicato.', copy.id);
}
export async function incrementViewsAction(id: string): Promise<void> { await repo.incrementViews(id); }

// ---------------- Categorie / Tag / Zone ----------------
export async function saveCategoryAction(c: Category): Promise<ActionResult> {
  await requirePermission('category.manage');
  if (!c.name.trim()) return fail('Il nome è obbligatorio.');
  const cat: Category = { ...c, id: c.id || uid('c'), slug: slugify(c.slug || c.name) };
  await repo.upsertCategory(cat); invalidateProfiles(); refresh();
  return ok('Categoria salvata.', cat.id);
}
export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requirePermission('category.manage');
  const cats = await getCategories();
  if (cats.length <= 1) return fail('Deve esistere almeno una categoria.');
  const fallback = cats.find((c) => c.id !== id)?.id ?? '';
  await repo.deleteCategoryRow(id, fallback);
  const s = await getSettings();
  await repo.saveSettingsRow({ ...s, homeSections: s.homeSections.filter((x) => x !== id) });
  refresh();
  return ok('Categoria eliminata.');
}
export async function moveCategoryAction(id: string, dir: -1 | 1): Promise<ActionResult> {
  await requirePermission('category.manage');
  const list = await getCategories();
  const i = list.findIndex((c) => c.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return ok();
  const a = list[i], b = list[j];
  await repo.upsertCategory({ ...a, order: b.order }); await repo.upsertCategory({ ...b, order: a.order });
  refresh();
  return ok();
}
export async function saveTagAction(t: Tag): Promise<ActionResult> {
  await requirePermission('tag.manage');
  if (!t.name.trim()) return fail('Il nome è obbligatorio.');
  const tag: Tag = { ...t, id: t.id || uid('t'), slug: slugify(t.slug || t.name) };
  await repo.upsertTag(tag); refresh();
  return ok('Tag salvato.', tag.id);
}
export async function ensureTagAction(name: string): Promise<Tag | null> {
  const u = await requireUser();
  if (!can(u, 'tag.manage') && !can(u, 'article.create')) return null;
  return ensureTag(name);
}
/** Crea il tag se manca (uso interno, senza controllo permessi). */
export async function ensureTag(name: string): Promise<Tag | null> {
  const slug = slugify(name);
  if (!slug) return null;
  const existing = await repo.findTagBySlug(slug);
  if (existing) return existing;
  const tag: Tag = { id: uid('t'), slug, name: name.trim() };
  await repo.upsertTag(tag);
  return tag;
}
export async function deleteTagAction(id: string): Promise<ActionResult> { await requirePermission('tag.manage'); await repo.deleteTagRow(id); refresh(); return ok('Tag eliminato.'); }
export async function saveZoneAction(z: Zone): Promise<ActionResult> {
  await requirePermission('category.manage');
  if (!z.name.trim()) return fail('Il nome è obbligatorio.');
  const zone: Zone = { ...z, id: z.id || uid('z'), slug: slugify(z.slug || z.name), name: z.name.trim() };
  await repo.upsertZone(zone); refresh();
  return ok('Zona salvata.', zone.id);
}
export async function deleteZoneAction(id: string): Promise<ActionResult> { await requirePermission('category.manage'); await repo.deleteZoneRow(id); refresh(); return ok('Zona eliminata.'); }

// ---------------- Media ----------------
export async function addMediaAction(m: { name: string; url: string; alt: string; size: number }): Promise<MediaItem | null> {
  const u = await requirePermission('media.manage');
  if (!m.url) return null;
  const item: MediaItem = { ...m, id: uid('m'), type: 'image', uploadedBy: u.id, createdAt: new Date().toISOString() };
  await repo.insertMedia(item); refresh();
  return item;
}
export async function updateMediaAction(m: MediaItem): Promise<ActionResult> { await requirePermission('media.manage'); await repo.updateMediaRow(m); refresh(); return ok('Salvato.'); }
export async function deleteMediaAction(id: string): Promise<ActionResult> { await requirePermission('media.manage'); const m = await repo.findMedia(id); if (m) { const { deleteStoredMedia } = await import('./storage'); await deleteStoredMedia(m); } await repo.deleteMediaRow(id); refresh(); return ok('File eliminato.'); }

// ---------------- Commenti ----------------
export async function setCommentStatusAction(id: string, status: CommentStatus): Promise<ActionResult> { await requirePermission('comment.moderate'); await repo.setCommentStatus(id, status); refresh(); return ok('Commento aggiornato.'); }
export async function deleteCommentAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await repo.deleteCommentRow(id); refresh(); return ok('Commento eliminato.'); }

// ---------------- Utenti ----------------
export async function saveUserAction(u: User): Promise<ActionResult> {
  const me = await requirePermission('user.manage');
  if (!u.name.trim() || !u.email.trim()) return fail('Nome ed email sono obbligatori.');
  const dup = await repo.findUserByEmail(u.email);
  if (dup && dup.id !== u.id) return fail('Email già in uso.');
  if (u.id === me.id && !u.active) return fail('Non puoi disattivare il tuo account.');
  const user: User = { ...u, id: u.id || uid('u'), avatar: u.avatar || `https://picsum.photos/seed/${slugify(u.name)}/200/200`, createdAt: u.createdAt || new Date().toISOString() };
  await repo.upsertUser(user); refresh();
  return ok('Utente salvato.', user.id);
}
export async function deleteUserAction(id: string): Promise<ActionResult> {
  const me = await requirePermission('user.manage');
  if (id === me.id) return fail('Non puoi eliminare te stesso.');
  if (await repo.userHasArticles(id)) return fail("L'utente ha articoli associati: disattivalo invece di eliminarlo.");
  await repo.deleteUserRow(id); refresh();
  return ok('Utente eliminato.');
}

// ---------------- Impostazioni / newsletter ----------------
export async function saveSettingsAction(s: SiteSettings): Promise<ActionResult> {
  await requirePermission('settings.manage');
  await repo.saveSettingsRow({ ...s, ticker: s.ticker.filter((t) => t.trim()), articlesPerPage: Math.min(48, Math.max(4, Number(s.articlesPerPage) || 12)) });
  refresh();
  return ok('Impostazioni salvate.');
}
export async function resetDemoAction(): Promise<ActionResult> { await requirePermission('settings.manage'); await resetDb(); invalidateProfiles(); refresh(); return ok('Dati demo ripristinati.'); }
export async function exportJsonAction(): Promise<string> {
  await requirePermission('settings.manage');
  const [categories, tags, users, zones, settings, articles] = await Promise.all([repo.listCategories(), repo.listTags(100000), repo.listUsers(), repo.listZones(), getSettings(), repo.listArticles({}, 'updated', 1000)]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), note: 'Esportazione parziale: ultimi 1000 articoli. Per l\'intero archivio copia il file SQLite.', categories, tags, users, zones, settings, articles }, null, 1);
}
export async function subscribeAction(email: string): Promise<ActionResult> { import('./webhooks').then((w) => w.dispatchWebhook('subscriber.created', { email })).catch(() => {}); const { subscribe } = await import('./newsletter'); const r = await subscribe(email, 'sito'); return r.ok ? ok(r.message) : fail(r.message); }
export async function removeSubscriberAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await repo.deleteSubscriberRow(id); refresh(); return ok('Iscritto rimosso.'); }

// ---------------- Eventi ----------------
async function uniqueEventSlug(base: string, excludeId: string): Promise<string> {
  const root = slugify(base) || 'evento'; let slug = root; let n = 2;
  while (await repo.eventSlugExists(slug, excludeId)) slug = `${root}-${n++}`;
  return slug;
}
export async function saveEventAction(e: Event): Promise<ActionResult> {
  await requirePermission('article.publish');
  if (!e.title.trim() || !e.dateFrom) return fail('Titolo e data di inizio sono obbligatori.');
  const event: Event = { ...e, id: e.id || uid('e'), slug: await uniqueEventSlug(e.slug || e.title, e.id), createdAt: e.createdAt || new Date().toISOString(), rating: Math.max(0, Math.min(5, Number(e.rating) || 0)) };
  if (event.dateTo && event.dateTo < event.dateFrom) event.dateTo = event.dateFrom;
  await repo.upsertEvent(event); refresh();
  return ok('Evento salvato.', event.id);
}
export async function setEventStatusAction(id: string, status: Event['status']): Promise<ActionResult> { await requirePermission('article.publish'); await repo.setEventStatus(id, status); refresh(); return ok('Evento aggiornato.'); }
export async function deleteEventAction(id: string): Promise<ActionResult> { await requirePermission('article.delete'); await repo.deleteEventRow(id); refresh(); return ok('Evento eliminato.'); }
export async function submitEventAction(input: { title: string; type: Event['type']; dateFrom: string; dateTo: string; timeInfo: string; place: string; address: string; zoneId: string; price: string; free: boolean; description: string; email: string }): Promise<ActionResult> {
  if (!input.title.trim() || !input.dateFrom || !input.place.trim()) return fail('Titolo, data e luogo sono obbligatori.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return fail('Inserisci un indirizzo email valido.');
  const event: Event = { id: uid('e'), slug: await uniqueEventSlug(input.title, ''), title: input.title.trim().slice(0, 140), description: `<p>${input.description.trim().slice(0, 3000).replace(/</g, '&lt;')}</p>`, type: input.type, dateFrom: input.dateFrom, dateTo: input.dateTo || null, timeInfo: input.timeInfo.slice(0, 60), place: input.place.trim().slice(0, 120), address: input.address.slice(0, 120), zoneId: input.zoneId, price: input.free ? '' : input.price.slice(0, 60), free: input.free, image: '', rating: 0, status: 'pending', submittedBy: input.email.trim(), createdAt: new Date().toISOString() };
  await repo.upsertEvent(event); refresh();
  return ok("Grazie! L'evento sarà pubblicato dopo la verifica della redazione.");
}

// ---------------- Segnalazioni ----------------
export async function submitReportAction(input: { name: string; email: string; zoneId: string; subject: string; body: string; image: string }): Promise<ActionResult> {
  if (!input.name.trim() || !input.subject.trim() || !input.body.trim()) return fail('Compila nome, oggetto e descrizione.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return fail('Inserisci un indirizzo email valido.');
  const r: Report = { id: uid('r'), name: input.name.trim().slice(0, 60), email: input.email.trim(), zoneId: input.zoneId, subject: input.subject.trim().slice(0, 140), body: input.body.trim().slice(0, 3000), image: input.image.startsWith('data:image/') && input.image.length < 2_000_000 ? input.image : '', status: 'new', reply: '', createdAt: new Date().toISOString() };
  await repo.insertReport(r); refresh();
  return ok('Segnalazione inviata. La redazione la verificherà al più presto.');
}
export async function updateReportAction(id: string, patch: { status?: Report['status']; reply?: string; subject?: string; body?: string }): Promise<ActionResult> { await requirePermission('comment.moderate'); await repo.updateReportRow(id, patch); refresh(); return ok('Segnalazione aggiornata.'); }
export async function deleteReportAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await repo.deleteReportRow(id); refresh(); return ok('Segnalazione eliminata.'); }
export async function setCookieConsentAction(value: 'all' | 'necessary'): Promise<void> { const s = await getSettings(); const version = s.privacy?.policyVersion ?? 1; (await cookies()).set('cookie_consent', `${value}:v${version}`, { path: '/', maxAge: 60 * 60 * 24 * 180, sameSite: 'lax' }); try { const { headers } = await import('next/headers'); const h = await headers(); const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim(); const { createHash } = await import('node:crypto'); const x3 = await import('./repo-extra3'); await x3.insertConsent(value, version, ip ? createHash('sha256').update(ip + (await (await import('./auth')).getSecret())).digest('hex').slice(0, 24) : '', h.get('user-agent') ?? ''); } catch { /* il consenso resta nel cookie */ } }

// ---------------- Temi ----------------
export async function previewThemeAction(theme: ThemeSettings): Promise<void> { await requirePermission('settings.manage'); (await cookies()).set(PREVIEW_COOKIE, JSON.stringify(theme), { path: '/', maxAge: 60 * 30, sameSite: 'lax', httpOnly: true }); redirect('/'); }
export async function clearThemePreviewAction(): Promise<void> { (await cookies()).delete(PREVIEW_COOKIE); redirect('/admin/impostazioni'); }
export async function applyThemeAction(theme: ThemeSettings): Promise<ActionResult> { await requirePermission('settings.manage'); await repo.saveSettingsRow({ ...(await getSettings()), theme }); (await cookies()).delete(PREVIEW_COOKIE); refresh(); return ok(`Tema "${theme.preset}" applicato a tutto il sito.`); }
export async function applyThemeFromPreviewAction(): Promise<void> {
  await requirePermission('settings.manage');
  const store = await cookies();
  const raw = store.get(PREVIEW_COOKIE)?.value;
  if (raw) { try { await repo.saveSettingsRow({ ...(await getSettings()), theme: JSON.parse(raw) as ThemeSettings }); } catch { /* ignore */ } }
  store.delete(PREVIEW_COOKIE); refresh(); redirect('/');
}

// ---------------- Articolo grezzo → ottimizzato ----------------
export async function submitRawArticleAction(input: { title: string; text: string; coverImage?: string; categoryId?: string; publish: boolean }): Promise<ActionResult & { report?: string[] }> {
  const u = await requireUser();
  if (!can(u, 'article.create')) return fail('Non puoi creare articoli.');
  if (!input.text.trim() || input.text.trim().split(/\s+/).length < 40) return fail('Il testo è troppo corto: servono almeno 40 parole.');
  const cfg = await getSeoSettings();
  const id = uid('a');
  const ctx = await rawContext(id);
  const p = prepareArticle({ title: input.title, text: input.text, coverImage: input.coverImage, categoryId: input.categoryId || undefined }, ctx, { maxLinks: cfg.maxInternalLinks, siteUrl: siteUrl() });
  const tagIds: string[] = [];
  for (const name of p.tagNames) { const t = await ensureTag(name); if (t) tagIds.push(t.id); }
  const now = new Date().toISOString();
  const article: Article = { id, slug: p.slug, kicker: p.kicker, title: p.title, subtitle: p.subtitle, excerpt: p.excerpt, content: p.content, coverImage: p.coverImage, coverCaption: p.coverCaption, categoryId: p.categoryId, tagIds, authorId: u.id, zoneId: p.zoneId, address: '', status: 'draft', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: p.seo, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now, seoReport: p.report };
  const status: ArticleStatus = input.publish && can(u, 'article.publish') ? 'published' : 'review';
  const r = await saveArticleAction(article, status);
  if (!r.ok) return r;
  return { ok: true, id: r.id, message: `Articolo ottimizzato e ${status === 'published' ? 'pubblicato' : 'inviato in revisione'}.`, report: p.report };
}

// ---------------- Importazione WordPress (job in background) ----------------
export type { ImportJob } from './repo';
export interface WpImportOptions { source: 'wxr' | 'rest' | 'feed'; file?: string; url?: string; maxPosts?: number; optimize: boolean; statusMode: 'keep' | 'draft' | 'review'; categoryMap: Record<string, string>; overwrite: boolean; downloadMedia: boolean }

export async function startImportJobAction(opts: WpImportOptions): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  const { createJob, runJobInBackground } = await import('./import-jobs');
  try {
    const job = await createJob(opts, me.id);
    runJobInBackground(job.id);
    return ok('Importazione avviata.', job.id);
  } catch (e) { return fail((e as Error).message); }
}
export async function previewImportAction(opts: WpImportOptions): Promise<ActionResult & { preview?: import('./import-jobs').ImportPreview }> {
  await requirePermission('settings.manage');
  const { previewImport } = await import('./import-jobs');
  try { return { ok: true, preview: await previewImport(opts) }; } catch (e) { return fail((e as Error).message); }
}
export async function getImportJobAction(id: string) { await requirePermission('settings.manage'); return repo.findJob(id); }
export async function listImportJobsAction() { await requirePermission('settings.manage'); return repo.listJobs(10); }
export async function cancelImportJobAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); const { cancelJob } = await import('./import-jobs'); cancelJob(id); await repo.updateJob(id, { status: 'cancelled', message: 'Annullata dall\'utente.' }); return ok('Importazione annullata.'); }
