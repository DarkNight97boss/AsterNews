'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentReader, getCurrentUser, requirePermission } from './auth';
import * as repo from './repo';
import * as x from './repo-extra';
import * as x3 from './repo-extra3';
import { getSettings } from './queries';
import { randomToken } from './security';
import { siteUrl } from './site-url';
import { slugify, uid } from './utils';
import type { ActionResult } from './actions';

export async function circlesAction(): Promise<{ id: string; name: string }[]> { if (!(await getCurrentUser())) return []; return (await getSettings()).circles ?? []; }
export async function saveCirclesAction(names: string[]): Promise<ActionResult> {
  await requirePermission('comment.moderate'); const s = await getSettings(); const old = s.circles ?? [];
  const next = names.map((n) => n.trim()).filter(Boolean).slice(0, 20).map((name) => old.find((c) => c.name === name) ?? { id: slugify(name).slice(0, 24) || uid('cr'), name });
  await repo.saveSettingsRow({ ...s, circles: next }); revalidateTag('settings', 'max'); revalidatePath('/admin/lettori'); return { ok: true, message: 'Cerchie salvate.' };
}
/** Chiave d'invito: chi apre il link (e accede o si registra) entra nella cerchia. Revocabile, con numero massimo di usi. */
export async function createCircleInviteAction(circleId: string, maxUses: number): Promise<ActionResult & { link?: string }> {
  await requirePermission('comment.moderate'); const s = await getSettings(); if (!(s.circles ?? []).some((c) => c.id === circleId)) return { ok: false, message: 'Cerchia non trovata.' };
  const token = randomToken(12); await x3.insertCircleInvite({ token, circleId, maxUses: Math.min(500, Math.max(1, Math.round(maxUses) || 1)), uses: 0, createdAt: new Date().toISOString(), revoked: false });
  revalidatePath('/admin/lettori'); return { ok: true, message: 'Chiave creata: copia il link.', link: `${siteUrl()}/account/invito?k=${token}` };
}
export async function revokeCircleInviteAction(token: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await x3.revokeCircleInvite(token); revalidatePath('/admin/lettori'); return { ok: true, message: 'Chiave revocata.' }; }
export async function setReaderCirclesAction(readerId: string, circles: string[]): Promise<ActionResult> { await requirePermission('comment.moderate'); const r = await x.findReader(readerId); if (!r) return { ok: false, message: 'Lettore non trovato.' }; await x3.savePrefs(readerId, { ...(r.prefs ?? {}), circles }); revalidatePath('/admin/lettori'); return { ok: true, message: 'Cerchie aggiornate.' }; }
export async function acceptCircleInviteAction(token: string): Promise<ActionResult> {
  const reader = await getCurrentReader(); if (!reader) return { ok: false, message: 'Accedi o registrati, poi riapri il link.' };
  const inv = await x3.findCircleInvite(token); if (!inv || inv.revoked || inv.uses >= inv.maxUses) return { ok: false, message: 'Questa chiave non è più valida.' };
  const cur = reader.prefs?.circles ?? []; if (!cur.includes(inv.circleId)) { await x3.savePrefs(reader.id, { ...(reader.prefs ?? {}), circles: [...cur, inv.circleId] }); await x3.useCircleInvite(token); }
  const name = ((await getSettings()).circles ?? []).find((c) => c.id === inv.circleId)?.name ?? ''; revalidatePath('/', 'layout'); return { ok: true, message: `Benvenuto nella cerchia «${name}».` };
}
