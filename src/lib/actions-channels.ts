'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission, requireUser } from './auth';
import * as repo from './repo';
import { canEdit } from './permissions';
import { getSettings } from './queries';
import type { WebhookConfig } from './models';
import { uid } from './utils';
import type { ActionResult } from './actions';

export async function saveWebhooksAction(hooks: WebhookConfig[]): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  const clean = hooks.filter((h) => /^https?:\/\//.test(h.url)).slice(0, 20).map((h) => ({ id: h.id || uid('wh'), url: h.url.trim(), secret: h.secret ?? '', events: h.events ?? [], enabled: h.enabled !== false }));
  await repo.saveSettingsRow({ ...s, webhooks: clean }); revalidateTag('settings', 'max'); revalidatePath('/admin/api');
  return { ok: true, message: 'Webhook salvati.' };
}
export async function testWebhookAction(url: string, secret: string): Promise<ActionResult> {
  await requirePermission('settings.manage');
  try { const { createHmac } = await import('node:crypto'); const body = JSON.stringify({ event: 'test', at: new Date().toISOString(), data: { hello: 'ASTER News' } }); const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Aster-Event': 'test', ...(secret ? { 'X-Aster-Signature': `sha256=${createHmac('sha256', secret).update(body).digest('hex')}` } : {}) }, body, signal: AbortSignal.timeout(10_000) }); return { ok: r.ok, message: `Risposta ${r.status}` }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Genera (o rigenera) l'audio-articolo con la voce sintetica configurata. */
export async function generateAudioAction(articleId: string): Promise<ActionResult & { url?: string }> {
  const me = await requireUser(); const a = await repo.findArticle(articleId); if (!a || !canEdit(me, a)) return { ok: false, message: 'Non consentito.' };
  try { const { audioForArticle } = await import('./tts'); const r = await audioForArticle(a); await repo.patchArticle(articleId, { extra: JSON.stringify({ ...(a.extra ?? {}), audioUrl: r.url, audioDuration: r.duration }) }); revalidateTag('articles', 'max'); revalidatePath(`/admin/articoli/${articleId}`); return { ok: true, message: `Audio generato (${Math.round(r.duration / 60)} min circa).`, url: r.url }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function setPodcastMetaAction(articleId: string, meta: { audioUrl?: string; chapters?: string; episode?: number }): Promise<ActionResult> {
  const me = await requireUser(); const a = await repo.findArticle(articleId); if (!a || !canEdit(me, a)) return { ok: false, message: 'Non consentito.' };
  const chapters = (meta.chapters ?? '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p[0] && p[1]).map((p) => ({ time: p[0], title: p[1] }));
  await repo.patchArticle(articleId, { extra: JSON.stringify({ ...(a.extra ?? {}), ...(meta.audioUrl !== undefined ? { audioUrl: meta.audioUrl || undefined } : {}), podcast: { ...(a.extra?.podcast ?? {}), chapters, ...(meta.episode ? { episode: meta.episode } : {}) } }) });
  revalidateTag('articles', 'max'); revalidatePath(`/admin/articoli/${articleId}`); return { ok: true, message: 'Dati podcast salvati.' };
}
