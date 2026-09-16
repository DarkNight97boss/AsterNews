'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import { buildDigest, sendDigest, sendTestDigest } from './newsletter';
import { sendPush } from './push';
import { deleteSubscriberRow, insertActivity } from './repo';
import * as x2 from './repo-extra2';
import { buildNewsletter, sendList, sendListTest } from './newsletters';
import { Newsletter } from './models';
import { slugify } from './utils';
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

// ---------------- Liste multiple ----------------
export async function saveNewsletterListAction(n: Newsletter): Promise<ActionResult> {
  await requirePermission('newsletter.send');
  if (!n.name.trim()) return { ok: false, message: 'Il nome è obbligatorio.' };
  const list: Newsletter = { ...n, id: n.id || uid('nl'), slug: slugify(n.slug || n.name), name: n.name.trim(), createdAt: n.createdAt || new Date().toISOString() };
  await x2.upsertNewsletter(list); revalidatePath('/admin/newsletter/liste');
  return { ok: true, message: 'Lista salvata.', id: list.id };
}
export async function deleteNewsletterListAction(id: string): Promise<ActionResult> { await requirePermission('newsletter.send'); await x2.deleteNewsletter(id); revalidatePath('/admin/newsletter/liste'); return { ok: true, message: 'Lista eliminata.' }; }
export async function sendListNowAction(id: string, subject?: string): Promise<ActionResult> {
  const me = await requirePermission('newsletter.send'); const l = await x2.findNewsletter(id); if (!l) return { ok: false, message: 'Lista non trovata.' };
  const r = await sendList(l, 'manual', subject);
  await insertActivity({ id: uid('ac'), userId: me.id, action: `ha inviato la newsletter «${l.name}» a`, target: `${r.sent} iscritti`, createdAt: new Date().toISOString() });
  revalidatePath('/admin/newsletter/liste');
  return { ok: r.ok, message: r.message };
}
export async function sendListTestAction(id: string, to: string): Promise<ActionResult> { await requirePermission('newsletter.send'); const l = await x2.findNewsletter(id); if (!l) return { ok: false, message: 'Lista non trovata.' }; const r = await sendListTest(l, to); return { ok: r.ok, message: r.message }; }
export async function previewListAction(id: string): Promise<string> { await requirePermission('newsletter.send'); const l = await x2.findNewsletter(id); if (!l) return ''; const b = await buildNewsletter(l); return b.render({ id: 'test', email: 'anteprima@example.com', createdAt: '' }, 'test'); }
