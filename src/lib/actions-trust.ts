'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentReader, requirePermission, requireUser } from './auth';
import * as repo from './repo';
import { getSettings } from './queries';
import { guardRate } from './ratelimit';
import { addRecord, deleteRecord, findRecord, updateRecord, type RecordStatus } from './records';
import type { TrustSettings } from './models';
import type { ActionResult } from './actions';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export async function saveTrustSettingsAction(t: TrustSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings();
  const clean: TrustSettings = { fundingYear: (t.fundingYear ?? '').slice(0, 20), replyEnabled: t.replyEnabled !== false, funding: (t.funding ?? []).filter((f) => f.label.trim()).slice(0, 20).map((f) => ({ label: f.label.trim().slice(0, 80), percent: Math.min(100, Math.max(0, Number(f.percent) || 0)), note: (f.note ?? '').slice(0, 200) })), commitments: (t.commitments ?? []).filter((c) => c.text.trim()).slice(0, 20).map((c) => ({ text: c.text.trim().slice(0, 240), state: c.state, note: (c.note ?? '').slice(0, 240) })), disclosures: Object.fromEntries(Object.entries(t.disclosures ?? {}).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim().slice(0, 500)])) };
  await repo.saveSettingsRow({ ...s, trust: clean }); revalidateTag('settings', 'max'); revalidatePath('/trasparenza'); revalidatePath('/admin/fiducia'); return { ok: true, message: 'Trasparenza aggiornata.' };
}
/** Diritto di replica: chi è citato in un articolo può chiedere di rispondere; la replica approvata compare sotto il testo. */
export async function requestReplyAction(articleId: string, input: { name: string; role: string; email: string; text: string }): Promise<ActionResult> {
  const limited = await guardRate('replica', 3, 3_600_000); if (limited) return { ok: false, message: limited };
  if (input.name.trim().length < 3 || !EMAIL.test(input.email.trim()) || input.text.trim().length < 40) return { ok: false, message: 'Servono nome, email valida e una replica di almeno 40 caratteri.' };
  const a = await repo.findArticle(articleId); if (!a || a.status !== 'published') return { ok: false, message: 'Articolo non trovato.' };
  await addRecord('reply', { ref: articleId, status: 'pending', data: { name: input.name.trim().slice(0, 120), role: input.role.trim().slice(0, 160), email: input.email.trim().toLowerCase(), text: input.text.trim().slice(0, 3000), title: a.title } });
  const n = await import('./repo-extra-notify'); await n.notifyPublishers({ id: '', name: 'Sistema' } as never, `Richiesta di replica su «${a.title}»`, '/admin/fiducia').catch(() => {});
  return { ok: true, message: 'Richiesta ricevuta: la redazione la valuta e ti risponde via email.' };
}
export async function moderateRecordAction(id: string, status: RecordStatus): Promise<ActionResult> { await requirePermission('comment.moderate'); const r = await findRecord(id); if (!r) return { ok: false, message: 'Voce non trovata.' }; await updateRecord(id, { status }); revalidatePath('/admin/fiducia'); revalidatePath('/admin/partecipazione'); return { ok: true, message: status === 'approved' ? 'Approvato.' : status === 'rejected' ? 'Rifiutato.' : 'Aggiornato.' }; }
export async function deleteRecordAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await deleteRecord(id); revalidatePath('/admin/fiducia'); revalidatePath('/admin/partecipazione'); return { ok: true, message: 'Eliminato.' }; }
/** Promesse ai lettori («aggiorneremo quando esce la sentenza») e previsioni («entro giugno il cantiere chiude»): hanno una scadenza e un esito. */
export async function addCommitmentAction(kind: 'promise' | 'prediction', articleId: string, text: string, dueAt: string, who = ''): Promise<ActionResult> {
  const u = await requireUser(); if (text.trim().length < 8 || !dueAt) return { ok: false, message: 'Scrivi il testo e scegli una data.' };
  const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Salva prima l\'articolo.' };
  await addRecord(kind, { ref: articleId, owner: u.id, dueAt: new Date(dueAt).toISOString(), data: { text: text.trim().slice(0, 400), who: who.trim().slice(0, 120), title: a.title } }); revalidatePath('/admin/fiducia'); return { ok: true, message: kind === 'promise' ? 'Promessa registrata: te la ricorderemo alla scadenza.' : 'Previsione archiviata.' };
}
export async function settleCommitmentAction(id: string, outcome: 'kept' | 'missed' | 'right' | 'partial' | 'wrong', note: string): Promise<ActionResult> {
  await requireUser(); const r = await findRecord<Record<string, unknown>>(id); if (!r) return { ok: false, message: 'Voce non trovata.' };
  await updateRecord(id, { status: 'done', data: { ...r.data, outcome, note: note.trim().slice(0, 400), settledAt: new Date().toISOString() } }); revalidatePath('/admin/fiducia'); revalidatePath('/previsioni'); return { ok: true, message: 'Esito registrato.' };
}
export async function readerIdentityAction(): Promise<{ name: string; email: string } | null> { const r = await getCurrentReader(); return r ? { name: r.name ?? '', email: r.email } : null; }
