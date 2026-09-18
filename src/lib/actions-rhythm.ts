'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import { getSettings } from './queries';
import { guardRate } from './ratelimit';
import { bumpCounter } from './records';
import { insertNotification } from './repo-extra3';
import { uid } from './utils';
import type { RhythmSettings } from './models';
import type { ActionResult } from './actions';

/** «Letto fino in fondo»: un contatore per articolo, senza sapere chi. */
export async function readEndAction(articleId: string): Promise<void> { if (await guardRate('fine-lettura', 30, 600_000)) return; const a = await repo.findArticle(articleId); if (a?.status === 'published') await bumpCounter('read-end', articleId, articleId); }
export async function saveRhythmAction(r: RhythmSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings(); const hhmm = (v?: string) => (/^\d{2}:\d{2}$/.test(v ?? '') ? v : undefined); const num = (v: unknown, max: number) => Math.min(max, Math.max(0, Number(v) || 0));
  await repo.saveSettingsRow({ ...s, rhythm: { quietFrom: hhmm(r.quietFrom), quietTo: hhmm(r.quietTo), hourlyRate: num(r.hourlyRate, 500), rpm: num(r.rpm, 200), subscriptionValue: num(r.subscriptionValue, 2000), maxOpen: Math.round(num(r.maxOpen, 50)) || 6 } }); revalidateTag('settings', 'max'); revalidatePath('/admin', 'layout'); return { ok: true, message: 'Ritmi di lavoro salvati.' };
}
/** Emergenza dichiarata: l'unica notifica che passa anche negli orari di quiete. Resta nel registro delle attività, perché non diventi un'abitudine. */
export async function declareEmergencyAction(text: string): Promise<ActionResult> {
  const u = await requirePermission('article.publish'); if (text.trim().length < 10) return { ok: false, message: 'Spiega in una riga cosa sta succedendo.' }; if (await guardRate('emergenza', 3, 3_600_000)) return { ok: false, message: 'Hai già dichiarato un\'emergenza da poco.' };
  const now = new Date().toISOString(); for (const x of await repo.listUsers()) if (x.active && x.id !== u.id) await insertNotification({ id: uid('nf'), userId: x.id, kind: 'emergency', text: `🚨 ${u.name}: ${text.trim().slice(0, 200)}`, url: '/admin/scaletta', read: false, createdAt: now });
  return { ok: true, message: 'Emergenza dichiarata: la notifica arriva a tutti, anche fuori turno.' };
}
