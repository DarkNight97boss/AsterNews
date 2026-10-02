'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission, requireUser } from './auth';
import * as repo from './repo';
import { getSettings } from './queries';
import { addRecord } from './records';
import type { ActionResult } from './actions';

export async function saveArchiveSettingsAction(a: { depositEnabled: boolean; depositEmail: string }): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, archive: { depositEnabled: !!a.depositEnabled, depositEmail: a.depositEmail.trim().slice(0, 160) } }); revalidateTag('settings', 'max'); revalidatePath('/admin/archivio'); return { ok: true, message: 'Impostazioni salvate.' }; }
export async function runDepositNowAction(): Promise<ActionResult> { await requirePermission('settings.manage'); const { legalDeposit } = await import('./archive-data'); const r = await legalDeposit(true); revalidatePath('/admin/archivio'); revalidatePath('/deposito'); return { ok: true, message: r || 'Niente da depositare.' }; }
/** «Non serve un seguito»: la storia esce dalla lista. */
export async function dismissFollowUpAction(articleId: string): Promise<ActionResult> { const u = await requireUser(); await addRecord('followup-dismissed', { id: `fud_${articleId}`, ref: articleId, owner: u.id, status: 'done', data: {} }); revalidatePath('/admin/archivio'); return { ok: true, message: 'Tolta dalla lista.' }; }
