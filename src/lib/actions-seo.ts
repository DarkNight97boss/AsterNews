'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentUser, requirePermission, requireUser } from './auth';
import * as repo from './repo';
import { canEdit } from './permissions';
import { getSettings } from './queries';
import { uid } from './utils';
import type { Article } from './models';
import type { ActionResult } from './actions';
import type { FeedItem } from './seo-intel';
import type { GscRow } from './search-console';

type R<T> = { ok: boolean; message?: string; data?: T };
export async function trendsAction(text: string): Promise<R<{ trends: FeedItem[]; matches: FeedItem[] }>> {
  if (!(await getCurrentUser())) return { ok: false, message: 'Non autorizzato.' };
  try { const { googleTrends, matchTrends } = await import('./seo-intel'); const trends = await googleTrends('IT'); return { ok: true, data: { trends, matches: matchTrends(text, trends) } }; } catch (e) { return { ok: false, message: 'Tendenze non disponibili: ' + (e as Error).message }; }
}
export async function competitorTitlesAction(q: string): Promise<R<FeedItem[]>> {
  if (!(await getCurrentUser())) return { ok: false, message: 'Non autorizzato.' }; if (!q.trim()) return { ok: false, message: 'Serve una parola chiave.' };
  try { const { newsTitles } = await import('./seo-intel'); return { ok: true, data: await newsTitles(q.trim(), 15) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Destinazioni per i link interni oltre agli articoli: tag, dossier (categorie speciali), eventi, zone. */
export async function linkTargetsAction(q: string): Promise<{ label: string; url: string; kind: string }[]> {
  if (!(await getCurrentUser())) return []; const t = q.toLowerCase().trim(); if (t.length < 2) return [];
  const [tags, cats, zones, events] = await Promise.all([repo.listTags(3000), repo.listCategories(), repo.listZones(), repo.listEvents({}, 200)]);
  const out: { label: string; url: string; kind: string }[] = [];
  for (const x of tags) if (x.name.toLowerCase().includes(t)) out.push({ label: x.name, url: `/tag/${x.slug}`, kind: 'tag' });
  for (const c of cats) if (c.name.toLowerCase().includes(t)) out.push({ label: c.name, url: `/${c.slug}`, kind: c.kind === 'standard' ? 'categoria' : c.kind });
  for (const z of zones) if (z.name.toLowerCase().includes(t)) out.push({ label: z.name, url: `/zone/${z.slug}`, kind: 'zona' });
  for (const e of events) if (e.title.toLowerCase().includes(t)) out.push({ label: e.title, url: `/eventi/${e.slug}`, kind: 'evento' });
  return out.slice(0, 20);
}
export async function searchConsoleAction(kind: 'query' | 'page', type: 'web' | 'discover' | 'news', days = 28): Promise<R<GscRow[]>> {
  await requirePermission('stats.view'); try { const { gscQuery } = await import('./search-console'); return { ok: true, data: await gscQuery(kind, days, type) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Traduzione con l'assistente AI: crea una bozza collegata all'originale (hreflang automatico). */
export async function translateArticleAction(id: string, lang: string): Promise<ActionResult> {
  const me = await requireUser(); const a = await repo.findArticle(id); if (!a || !canEdit(me, a)) return { ok: false, message: 'Non consentito.' };
  const { aiAvailable, askJson } = await import('./ai'); if (!(await aiAvailable())) return { ok: false, message: 'Assistente AI non configurato.' };
  const names: Record<string, string> = { en: 'inglese', fr: 'francese', de: 'tedesco', es: 'spagnolo', pt: 'portoghese', ro: 'rumeno', ar: 'arabo', zh: 'cinese', sq: 'albanese', uk: 'ucraino' };
  try {
    const t = await askJson<{ title: string; subtitle: string; excerpt: string; content: string; kicker: string }>(`Traduci in ${names[lang] ?? lang} questo articolo giornalistico mantenendo l'HTML intatto (stessi tag, stessi link). Rispondi SOLO con JSON {"title","subtitle","excerpt","kicker","content"}.\n\nTITOLO: ${a.title}\nOCCHIELLO: ${a.kicker}\nSOTTOTITOLO: ${a.subtitle}\nSOMMARIO: ${a.excerpt}\nCONTENUTO:\n${a.content.slice(0, 40000)}`, { maxTokens: 12000, effort: 'medium' });
    const now = new Date().toISOString(); const nid = uid('a');
    const draft: Article = { ...a, id: nid, slug: `${a.slug}-${lang}`, title: t.title, subtitle: t.subtitle, excerpt: t.excerpt, kicker: t.kicker, content: t.content, status: 'draft', publishedAt: null, scheduledAt: null, views: 0, createdAt: now, updatedAt: now, seo: { ...a.seo, title: '', description: '', canonical: '' }, extra: { ...(a.extra ?? {}), lang, translationOf: a.id, translations: undefined, abStats: undefined, titleB: undefined } };
    await repo.upsertArticle(draft);
    await repo.patchArticle(a.id, { extra: JSON.stringify({ ...(a.extra ?? {}), translations: { ...(a.extra?.translations ?? {}), [lang]: nid } }) });
    revalidatePath(`/admin/articoli/${a.id}`); return { ok: true, message: `Bozza in ${names[lang] ?? lang} creata: rivedila prima di pubblicare.`, id: nid };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function setTitleBAction(id: string, titleB: string): Promise<ActionResult> {
  const me = await requireUser(); const a = await repo.findArticle(id); if (!a || !canEdit(me, a)) return { ok: false, message: 'Non consentito.' };
  await repo.patchArticle(id, { extra: JSON.stringify({ ...(a.extra ?? {}), titleB: titleB.trim().slice(0, 160) || undefined, abStats: titleB.trim() ? { a: 0, b: 0, ca: 0, cb: 0 } : undefined }) });
  revalidateTag('articles', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: titleB.trim() ? 'Test A/B avviato: la home alterna i due titoli.' : 'Test A/B rimosso.' };
}
export async function languagesAction(): Promise<string[]> { if (!(await getCurrentUser())) return []; const s = await getSettings(); return ((s.seo as { languages?: string } | undefined)?.languages ?? '').split(',').map((x) => x.trim()).filter(Boolean); }

/** Rilevazione notizie duplicate: articoli già esistenti con titolo simile → «aggiorna invece di creare». */
export async function similarTitlesAction(title: string, excludeId: string): Promise<{ id: string; title: string; status: string; updatedAt: string }[]> {
  if (!(await getCurrentUser()) || title.trim().length < 12) return [];
  try { const r = await repo.searchArticles(title.trim(), 6, 0, {}); const words = new Set(title.toLowerCase().split(/\W+/).filter((w) => w.length > 3)); return r.items.filter((a) => a.id !== excludeId).map((a) => ({ a, score: a.title.toLowerCase().split(/\W+/).filter((w) => words.has(w)).length / Math.max(1, words.size) })).filter((x) => x.score >= 0.5).slice(0, 3).map(({ a }) => ({ id: a.id, title: a.title, status: a.status, updatedAt: a.updatedAt })); } catch { return []; }
}
