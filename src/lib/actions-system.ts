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
