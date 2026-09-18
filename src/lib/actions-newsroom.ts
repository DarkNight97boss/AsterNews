'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission, requireUser } from './auth';
import { metaSet } from './db';
import * as repo from './repo';
import { getSettings } from './queries';
import type { ActionResult } from './actions';

export async function saveRundownNotesAction(day: string, notes: string): Promise<ActionResult> { await requireUser(); if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, message: 'Data non valida.' }; await metaSet(`rundown_${day}`, notes.slice(0, 8000)); revalidatePath('/admin/scaletta'); return { ok: true, message: 'Scaletta salvata.' }; }
export async function runBriefingAction(): Promise<ActionResult> { await requirePermission('article.publish'); try { const { runBriefing } = await import('./briefing'); const r = await runBriefing(true); revalidatePath('/admin/scaletta'); return { ok: !/nessun|non configurato|mancano/.test(r), message: `Rassegna: ${r}.` }; } catch (e) { return { ok: false, message: (e as Error).message }; } }
export async function saveBriefingSettingsAction(b: { enabled: boolean; hour: number; feeds: string; count: number }): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  await repo.saveSettingsRow({ ...s, briefing: { enabled: !!b.enabled, hour: Math.min(23, Math.max(0, Math.round(b.hour) || 6)), feeds: b.feeds.slice(0, 4000), count: Math.min(10, Math.max(1, Math.round(b.count) || 5)) } }); revalidateTag('settings', 'max'); revalidatePath('/admin/scaletta');
  return { ok: true, message: 'Rassegna mattutina salvata.' };
}
