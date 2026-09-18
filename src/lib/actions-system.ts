'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import { DEFAULT_EXTENSIONS } from './models';
import { getSettings } from './queries';
import { triggerDeploy } from './updates';
import { uid } from './utils';
import type { ActionResult } from './actions';

export async function triggerDeployAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  const r = await triggerDeploy();
  if (r.ok) await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha avviato un aggiornamento del', target: 'sito', createdAt: new Date().toISOString() });
  return r;
}
export async function toggleExtensionAction(id: string, enabled: boolean): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  const s = await getSettings(); const ext = { ...DEFAULT_EXTENSIONS, ...(s.extensions ?? {}) };
  ext.enabled = enabled ? [...new Set([...ext.enabled, id])] : ext.enabled.filter((x) => x !== id);
  await repo.saveSettingsRow({ ...s, extensions: ext });
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: enabled ? 'ha attivato l\'estensione' : 'ha disattivato l\'estensione', target: id, createdAt: new Date().toISOString() });
  revalidateTag('settings', 'max'); revalidatePath('/admin/estensioni');
  return { ok: true, message: enabled ? 'Estensione attivata.' : 'Estensione disattivata.' };
}
export async function saveExtensionConfigAction(id: string, config: Record<string, string>): Promise<ActionResult> {
  await requirePermission('settings.manage');
  const s = await getSettings(); const ext = { ...DEFAULT_EXTENSIONS, ...(s.extensions ?? {}) };
  ext.config = { ...ext.config, [id]: config };
  await repo.saveSettingsRow({ ...s, extensions: ext });
  revalidateTag('settings', 'max'); revalidatePath('/admin/estensioni');
  return { ok: true, message: 'Configurazione salvata.' };
}

// ---------------- Chiavi API ----------------
export async function createApiKeyAction(name: string, scopes: string[] = ['read']): Promise<ActionResult & { key?: string }> {
  const me = await requirePermission('settings.manage');
  if (!name.trim()) return { ok: false, message: 'Dai un nome alla chiave.' };
  const { randomToken } = await import('./security'); const { createHash } = await import('node:crypto'); const x3 = await import('./repo-extra3');
  const key = 'ak_' + randomToken(24); const prefix = key.slice(0, 10);
  await x3.insertApiKey({ id: uid('ak'), name: name.trim().slice(0, 60), prefix, scopes, active: true, calls: 0, lastUsed: null, createdBy: me.id, createdAt: new Date().toISOString() }, createHash('sha256').update(key).digest('hex'));
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha creato la chiave API', target: name, createdAt: new Date().toISOString() });
  revalidatePath('/admin/api');
  return { ok: true, message: 'Chiave creata: copiala ora, non sarà più visibile.', key };
}
export async function toggleApiKeyAction(id: string, active: boolean): Promise<ActionResult> { await requirePermission('settings.manage'); const x3 = await import('./repo-extra3'); await x3.setApiKeyActive(id, active); revalidatePath('/admin/api'); return { ok: true, message: active ? 'Chiave riattivata.' : 'Chiave sospesa.' }; }
export async function deleteApiKeyAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); const x3 = await import('./repo-extra3'); await x3.deleteApiKey(id); revalidatePath('/admin/api'); return { ok: true, message: 'Chiave eliminata.' }; }

// ---------------- Ruoli personalizzabili ----------------
export async function saveRolePermissionsAction(overrides: Record<string, string[]>): Promise<ActionResult> {
  await requirePermission('user.manage');
  const s = await getSettings(); const { setPermissionOverrides } = await import('./permissions');
  const clean: Record<string, string[]> = {}; for (const [role, perms] of Object.entries(overrides)) if (role !== 'admin') clean[role] = perms;
  await repo.saveSettingsRow({ ...s, roles: { overrides: clean } }); setPermissionOverrides(clean);
  revalidateTag('settings', 'max'); revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Permessi aggiornati.' };
}
export async function dismissOnboardingAction(): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, onboarding: { dismissed: true } }); revalidateTag('settings', 'max'); revalidatePath('/admin'); return { ok: true }; }

// ---------------- Cestino ----------------
export async function restoreArticleAction(id: string): Promise<ActionResult> { const me = await requirePermission('article.delete'); await repo.restoreArticle(id); await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha ripristinato dal cestino', target: id, articleId: id, createdAt: new Date().toISOString() }); revalidateTag('articles', 'max'); revalidatePath('/admin/articoli'); return { ok: true, message: 'Articolo ripristinato.' }; }
export async function purgeArticleAction(id: string): Promise<ActionResult> { await requirePermission('article.delete'); await repo.deleteArticleRow(id); revalidatePath('/admin/articoli'); return { ok: true, message: 'Eliminato definitivamente.' }; }
export async function emptyTrashAction(): Promise<ActionResult> { await requirePermission('article.delete'); const n = await repo.purgeTrash(0); revalidatePath('/admin/articoli'); return { ok: true, message: `${n} articoli eliminati definitivamente.` }; }

// ---------------- Notifiche ----------------
export async function myNotificationsAction(): Promise<{ items: import('./models').Notification[]; unread: number }> { const { getCurrentUser } = await import('./auth'); const me = await getCurrentUser(); if (!me) return { items: [], unread: 0 }; const x3 = await import('./repo-extra3'); const [items, unread] = await Promise.all([x3.listNotifications(me.id, 20), x3.countUnread(me.id)]); return { items, unread }; }
export async function markNotificationsReadAction(id?: string): Promise<void> { const { getCurrentUser } = await import('./auth'); const me = await getCurrentUser(); if (!me) return; const x3 = await import('./repo-extra3'); await x3.markNotificationsRead(me.id, id); }
export async function markBrokenFixedAction(id: string): Promise<ActionResult> { await requirePermission('redirect.manage'); const x3 = await import('./repo-extra3'); await x3.markBrokenFixed(id); revalidatePath('/admin/redirect'); return { ok: true }; }
export async function runLinkCheckAction(): Promise<ActionResult> { await requirePermission('redirect.manage'); const { checkBrokenLinks } = await import('./broken-links'); const r = await checkBrokenLinks(40, 150); revalidatePath('/admin/redirect'); return { ok: true, message: r }; }

// ---------------- Donazioni e API: impostazioni rapide ----------------
export async function saveDonationsSettingsAction(d: import('./models').DonationsSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  const amounts = [...new Set(d.amounts.map((n) => Math.round(Number(n))).filter((n) => n >= 1 && n <= 5000))].sort((a, b) => a - b).slice(0, 6);
  await repo.saveSettingsRow({ ...s, donations: { enabled: !!d.enabled, title: d.title.trim().slice(0, 80) || 'Sostieni il giornalismo locale', text: d.text.trim().slice(0, 300), amounts: amounts.length ? amounts : [3, 5, 10, 25], thanks: d.thanks.trim().slice(0, 300) } });
  revalidateTag('settings', 'max'); revalidatePath('/', 'layout');
  return { ok: true, message: 'Impostazioni donazioni salvate.' };
}
export async function saveApiSettingsAction(a: import('./models').ApiSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, api: { enabled: !!a.enabled, requireKey: !!a.requireKey, rateLimitPerMinute: Math.min(5000, Math.max(10, Math.round(Number(a.rateLimitPerMinute) || 120))) } });
  revalidateTag('settings', 'max'); revalidatePath('/admin/api');
  return { ok: true, message: 'Impostazioni API salvate.' };
}

// ---------------- Prestazioni (PageSpeed) ----------------
export async function runPageSpeedAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage');
  const { auditSite, apiKey } = await import('./pagespeed');
  if (!(await apiKey())) return { ok: false, message: 'Serve una chiave API PageSpeed Insights (gratuita): inseriscila qui sotto o nella variabile PAGESPEED_API_KEY.' };
  const r = await auditSite('manuale');
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha misurato le prestazioni di', target: `${r.runs.length} pagine`, createdAt: new Date().toISOString() });
  revalidatePath('/admin/prestazioni');
  if (!r.runs.length) return { ok: false, message: r.errors[0] ?? 'Nessuna misurazione.' };
  return { ok: true, message: `${r.runs.length} misurazioni completate${r.alerts.length ? ` · ${r.alerts.length} avvisi` : ''}${r.errors.length ? ` · ${r.errors.length} errori: ${r.errors[0]}` : ''}` };
}
export async function savePerformanceSettingsAction(p: import('./models').PerformanceSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, performance: { psiApiKey: p.psiApiKey === '__keep__' ? (s.performance?.psiApiKey ?? '') : p.psiApiKey.trim(), frequency: (['off', 'daily', 'weekly'] as const).includes(p.frequency) ? p.frequency : 'weekly', desktop: !!p.desktop, threshold: Math.min(100, Math.max(0, Math.round(Number(p.threshold) || 90))), pages: p.pages.trim().slice(0, 2000), alerts: !!p.alerts } });
  revalidateTag('settings', 'max'); revalidatePath('/admin/prestazioni');
  return { ok: true, message: 'Impostazioni prestazioni salvate.' };
}

// ---------------- Builder home, libreria layout, CSS e versioni tema, edizioni ----------------
export async function saveHomeBlocksAction(blocks: import('./models').HomeBlock[]): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, homeBlocks: blocks.slice(0, 30).map((b) => ({ ...b, id: b.id || uid('hb'), title: (b.title ?? '').slice(0, 60), count: Math.min(12, Math.max(1, Number(b.count) || 4)), html: b.type === 'html' ? (b.html ?? '').slice(0, 20000) : undefined })) });
  revalidateTag('settings', 'max'); revalidateTag('articles', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Home salvata.' };
}
async function snapshotTheme(label: string): Promise<void> { const s = await getSettings(); const versions = [{ id: uid('tv'), at: new Date().toISOString(), label, theme: s.theme }, ...(s.themeVersions ?? [])].slice(0, 12); await repo.saveSettingsRow({ ...s, themeVersions: versions }); }
export async function applyLayoutPresetAction(id: string): Promise<ActionResult> {
  await requirePermission('settings.manage'); const { LAYOUT_PRESETS } = await import('./layout-library'); const p = LAYOUT_PRESETS.find((x) => x.id === id); if (!p) return { ok: false, message: 'Layout non trovato.' };
  await snapshotTheme('prima del layout ' + p.name); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, theme: { ...s.theme, ...p.theme }, homeBlocks: p.blocks.map((b) => ({ ...b, id: uid('hb') })) });
  revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: `Layout «${p.name}» applicato.` };
}
export async function importLayoutAction(input: string): Promise<ActionResult> {
  await requirePermission('settings.manage');
  try { let text = input.trim(); if (/^https?:\/\//.test(text)) { const r = await fetch(text, { signal: AbortSignal.timeout(10_000) }); text = await r.text(); } const j = JSON.parse(text) as { theme?: Partial<import('./themes').ThemeSettings>; blocks?: import('./models').HomeBlock[]; name?: string }; if (!j.blocks && !j.theme) return { ok: false, message: 'JSON senza tema né blocchi.' }; await snapshotTheme('prima dell\'importazione'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, theme: { ...s.theme, ...(j.theme ?? {}) }, homeBlocks: (j.blocks ?? s.homeBlocks ?? []).map((b) => ({ ...b, id: uid('hb') })) }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: `Layout ${j.name ? '«' + j.name + '» ' : ''}importato.` }; } catch (e) { return { ok: false, message: 'Importazione fallita: ' + (e as Error).message }; }
}
export async function saveCustomCssAction(css: string): Promise<ActionResult> {
  await requirePermission('settings.manage'); await snapshotTheme('modifica CSS'); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, theme: { ...s.theme, customCss: css.slice(0, 60000) } }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'CSS salvato (versione precedente conservata).' };
}
export async function restoreThemeVersionAction(id: string): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings(); const v = (s.themeVersions ?? []).find((x) => x.id === id); if (!v) return { ok: false, message: 'Versione non trovata.' };
  await snapshotTheme('prima del ripristino'); const s2 = await getSettings(); await repo.saveSettingsRow({ ...s2, theme: v.theme }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Tema ripristinato.' };
}
export async function saveEditionUsersAction(map: Record<string, string[]>): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, editionUsers: map }); revalidateTag('settings', 'max'); revalidatePath('/admin', 'layout'); return { ok: true, message: 'Redazioni delle edizioni salvate.' }; }
export async function editionsListAction(): Promise<{ id: string; name: string }[]> { const { getCurrentUser } = await import('./auth'); if (!(await getCurrentUser())) return []; const x = await import('./repo-extra'); return (await x.listEditions()).filter((e) => e.active).map((e) => ({ id: e.id, name: e.name })); }
/** Syndication: copia l'articolo in un'altra edizione con canonical sull'originale. */
export async function syndicateArticleAction(articleId: string, editionId: string): Promise<ActionResult> {
  const me = await requirePermission('article.publish'); const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Articolo non trovato.' };
  const x = await import('./repo-extra'); const ed = (await x.listEditions()).find((e) => e.id === editionId); if (!ed) return { ok: false, message: 'Edizione non trovata.' };
  const cats = await repo.listCategories(); const c = cats.find((k) => k.id === a.categoryId); const { siteUrl } = await import('./site-url'); const now = new Date().toISOString(); const id = uid('a');
  await repo.upsertArticle({ ...a, id, slug: `${a.slug}-${ed.slug}`, editionId, status: 'published', publishedAt: now, createdAt: now, updatedAt: now, views: 0, seo: { ...a.seo, canonical: `${siteUrl()}/${c?.slug ?? 'notizie'}/${a.slug}` }, extra: { ...(a.extra ?? {}), abStats: undefined, titleB: undefined } });
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: `ha condiviso con l'edizione ${ed.name}`, target: a.title, articleId: id, createdAt: now });
  revalidateTag('articles', 'max'); return { ok: true, message: `Articolo pubblicato anche su «${ed.name}».`, id };
}

// ---------------- Privacy, staging ----------------
export async function savePrivacyAction(p: { policyVersion: number; geoLookup: boolean; dpaNote: string }): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, privacy: { policyVersion: Math.max(1, Math.round(p.policyVersion) || 1), geoLookup: !!p.geoLookup, dpaNote: p.dpaNote.slice(0, 4000) } }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Impostazioni privacy salvate.' }; }
export async function deployStagingAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage'); const s = await getSettings(); const url = s.updates?.stagingHookUrl; if (!url) return { ok: false, message: 'Deploy Hook di staging non impostato.' };
  try { const r = await fetch(url, { method: 'POST' }); await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha avviato un\'anteprima di', target: 'staging', createdAt: new Date().toISOString() }); return { ok: r.ok, message: r.ok ? 'Anteprima staging avviata: tra qualche minuto sarà sul dominio di anteprima Vercel.' : `Vercel ha risposto ${r.status}` }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function promoteStagingAction(): Promise<ActionResult> {
  const me = await requirePermission('settings.manage'); const s = await getSettings(); const token = s.updates?.vercelToken || process.env.VERCEL_TOKEN || ''; const project = s.updates?.vercelProjectId || process.env.VERCEL_PROJECT_ID || ''; if (!token || !project) return { ok: false, message: 'Token o ID progetto Vercel mancanti.' };
  try {
    const list = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project}&target=preview&state=READY&limit=5`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()) as { deployments?: { uid: string; url: string; meta?: Record<string, string>; createdAt: number }[]; error?: { message: string } };
    if (list.error) return { ok: false, message: list.error.message }; const d = (list.deployments ?? []).find((x) => (x.meta?.githubCommitRef ?? '') === 'staging') ?? list.deployments?.[0]; if (!d) return { ok: false, message: 'Nessuna anteprima pronta da promuovere.' };
    const r = await fetch(`https://api.vercel.com/v10/projects/${project}/promote/${d.uid}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) return { ok: false, message: `Promozione rifiutata (${r.status}): ${(await r.text()).slice(0, 120)}` };
    await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha promosso in produzione', target: d.url, createdAt: new Date().toISOString() }); return { ok: true, message: `Promossa in produzione: ${d.url}` };
  } catch (e) { return { ok: false, message: (e as Error).message }; }
}

// ---------------- Il CMS che si adatta ----------------
export async function trackNavAction(path: string): Promise<void> { const { getCurrentUser } = await import('./auth'); const me = await getCurrentUser(); if (!me || !path.startsWith('/admin')) return; const clean = '/' + path.split('?')[0].split('/').filter(Boolean).slice(0, 3).join('/'); const x3 = await import('./repo-extra3'); await x3.trackNav(me.id, clean.replace(/\/(a_|[a-z]{1,3}_)[a-z0-9]+$/i, '')).catch(() => {}); }
export async function saveAdaptAction(a: import('./admin-nav').AdaptSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const { PROFILES } = await import('./admin-nav'); const s = await getSettings();
  const voc: Record<string, string> = {}; for (const [k, v] of Object.entries(a.vocabulary ?? {})) if (['article', 'articles', 'write', 'site', 'team'].includes(k) && String(v).trim()) voc[k] = String(v).trim().slice(0, 40);
  await repo.saveSettingsRow({ ...s, adapt: { profile: PROFILES.some((p) => p.id === a.profile) ? a.profile : 'quotidiano', autoHide: !!a.autoHide, blackBox: a.blackBox !== false, vocabulary: voc, pinned: (a.pinned ?? []).filter((h) => h.startsWith('/admin')).slice(0, 40) } });
  revalidateTag('settings', 'max'); revalidatePath('/admin', 'layout'); return { ok: true, message: 'Il CMS si è adattato.' };
}
