'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import { buildDigest, sendDigest, sendTestDigest } from './newsletter';
import { sendPush } from './push';
import { deleteSubscriberRow, insertActivity } from './repo';
import { uid } from './utils';
import type { ActionResult } from './actions';

export async function sendDigestNowAction(subject?: string): Promise<ActionResult> {
  const me = await requirePermission('newsletter.send');
  const r = await sendDigest('manual', subject?.trim() || undefined);
  await insertActivity({ id: uid('ac'), userId: me.id, action: 'ha inviato la newsletter a', target: `${r.sent} iscritti`, createdAt: new Date().toISOString() });
  revalidatePath('/admin/newsletter');
  return { ok: r.ok, message: r.message };
}
export async function sendTestDigestAction(to: string): Promise<ActionResult> { await requirePermission('newsletter.send'); const r = await sendTestDigest(to); return { ok: r.ok, message: r.message }; }
export async function previewDigestAction(): Promise<string> { await requirePermission('newsletter.send'); const d = await buildDigest(); return d.html('#'); }
export async function removeSubscriberAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await deleteSubscriberRow(id); revalidatePath('/admin/newsletter'); return { ok: true, message: 'Iscritto rimosso.' }; }
export async function sendPushNowAction(input: { title: string; body: string; url: string }): Promise<ActionResult> {
  const me = await requirePermission('newsletter.send');
  if (!input.title.trim()) return { ok: false, message: 'Serve un titolo.' };
  const r = await sendPush({ title: input.title.trim(), body: input.body.trim(), url: input.url.trim() || '/' });
  await insertActivity({ id: uid('ac'), userId: me.id, action: 'ha inviato una notifica push a', target: `${r.sent} dispositivi`, createdAt: new Date().toISOString() });
  return { ok: r.sent > 0 || r.failed === 0, message: `Notifica inviata a ${r.sent} dispositivi${r.failed ? `, ${r.failed} non raggiungibili` : ''}.` };
}
