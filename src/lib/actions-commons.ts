'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentReader, requirePermission } from './auth';
import * as repo from './repo';
import { getSettings } from './queries';
import { guardRate } from './ratelimit';
import { addRecord, findRecord, listRecords, updateRecord } from './records';
import { COMMUNITY, validateContribution } from './community';
import { randomToken } from './security';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { CommonsSettings } from './models';
import type { ActionResult } from './actions';

/** Un solo ingresso per tutti i contributi della comunità: valida secondo la definizione, limita la frequenza, mette in attesa di moderazione. */
export async function submitContributionAction(kind: string, ref: string, input: Record<string, string>): Promise<ActionResult & { link?: string }> {
  const def = COMMUNITY[kind]; if (!def) return { ok: false, message: 'Tipo di contributo sconosciuto.' }; const limited = await guardRate(`contributo-${kind}`, def.perHour, 3_600_000); if (limited) return { ok: false, message: limited };
  const v = validateContribution(def, input); if (!v.ok) return v; const data: Record<string, string> = { ...v.data }; let link: string | undefined;
  if (kind === 'translation') { const a = await repo.findArticle(ref); if (!a || a.status !== 'published' || a.extra?.circle) return { ok: false, message: 'Articolo non trovato.' }; data.articleTitle = a.title; }
  if (kind === 'photo') { try { const { uploadImage } = await import('./storage'); const m = data.image.match(/^data:(image\/\w+);base64,(.+)$/)!; const f = await uploadImage(Buffer.from(m[2], 'base64'), `archivio-${Date.now()}.jpg`, m[1]); data.image = f.url; } catch { return { ok: false, message: 'Non riesco a salvare la foto: riprova con un file più piccolo.' }; } const { placeSlug } = await import('./reading'); data.placeSlug = placeSlug(data.place); }
  if (kind === 'board') { data.token = randomToken(12); }
  const rec = await addRecord(kind, { ref, status: 'pending', data, dueAt: def.expiresDays ? new Date(Date.now() + def.expiresDays * 86_400_000).toISOString() : null });
  if (kind === 'board') link = `${siteUrl()}/bacheca?risolto=${rec.id}&chiave=${data.token}`;
  return { ok: true, message: def.thanks, link };
}
export async function confirmLogAction(id: string): Promise<ActionResult> { if (await guardRate('taccuino-conferma', 10, 3_600_000)) return { ok: false, message: 'Riprova più tardi.' }; const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'log' || r.status !== 'approved') return { ok: false, message: 'Voce non trovata.' }; await updateRecord(id, { data: { ...r.data, confirms: String(Number(r.data.confirms ?? 0) + 1) } }); revalidatePath('/taccuino'); return { ok: true, message: 'Grazie della conferma.' }; }
export async function guessYearAction(photoId: string, year: number): Promise<ActionResult> { if (await guardRate('datazione', 15, 3_600_000)) return { ok: false, message: 'Riprova più tardi.' }; const r = await findRecord(photoId); if (!r || r.kind !== 'photo' || r.status !== 'approved' || !Number.isInteger(year) || year < 1840 || year > new Date().getFullYear()) return { ok: false, message: 'Anno non valido.' }; await addRecord('photo-year', { ref: photoId, data: { year: String(year) } }); revalidatePath('/archivio-fotografico'); return { ok: true, message: 'Grazie: la tua datazione conta.' }; }
export async function resolveBoardAction(id: string, token: string): Promise<ActionResult> { const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'board' || !token || r.data.token !== token) return { ok: false, message: 'Link non valido.' }; await updateRecord(id, { status: 'done' }); revalidatePath('/bacheca'); return { ok: true, message: 'Segnato come risolto. Siamo contenti!' }; }
/** Assemblea dei lettori: un voto a testa, solo con account (così nessuno vota due volte). */
export async function voteAction(roundId: string, optionId: string): Promise<ActionResult> {
  const reader = await getCurrentReader(); if (!reader) return { ok: false, message: 'Per votare serve l\'account: così ogni lettore vale uno.' }; const round = await findRecord<{ options: { id: string }[]; subscribersOnly?: boolean }>(roundId);
  if (!round || round.kind !== 'assembly' || round.status !== 'open' || (round.dueAt && round.dueAt < new Date().toISOString())) return { ok: false, message: 'Questa votazione è chiusa.' }; if (round.data.subscribersOnly && !reader.premium) return { ok: false, message: 'Questa scelta spetta a chi sostiene il giornale con l\'abbonamento.' }; if (!round.data.options.some((o) => o.id === optionId)) return { ok: false, message: 'Opzione non valida.' };
  await addRecord('vote', { id: `vt_${roundId}_${reader.id}`.slice(0, 120), ref: roundId, owner: reader.id, data: { option: optionId } }); revalidatePath('/assemblea'); return { ok: true, message: 'Voto registrato. Puoi cambiarlo finché la votazione è aperta.' };
}
export async function saveRoundAction(id: string, r: { title: string; intro: string; options: { id: string; title: string; desc: string }[]; closesAt: string; subscribersOnly: boolean; open: boolean }): Promise<ActionResult> {
  await requirePermission('settings.manage'); const options = r.options.filter((o) => o.title.trim()).slice(0, 6).map((o) => ({ id: o.id || uid('op'), title: o.title.trim().slice(0, 120), desc: o.desc.trim().slice(0, 400) })); if (r.title.trim().length < 5 || options.length < 2 || !r.closesAt) return { ok: false, message: 'Servono un titolo, almeno due proposte e una data di chiusura.' };
  await addRecord('assembly', { id: id || uid('asm'), status: r.open ? 'open' : 'done', dueAt: new Date(r.closesAt).toISOString(), data: { title: r.title.trim().slice(0, 140), intro: r.intro.trim().slice(0, 600), options, subscribersOnly: r.subscribersOnly } }); revalidatePath('/assemblea'); revalidatePath('/admin/comunita'); return { ok: true, message: 'Votazione salvata.' };
}
export async function councilUpdateAction(id: string, patch: { sentAt?: string; answer?: string }): Promise<ActionResult> { await requirePermission('comment.moderate'); const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'council') return { ok: false, message: 'Domanda non trovata.' }; const data = { ...r.data }; if (patch.sentAt) data.sentAt = new Date(patch.sentAt).toISOString(); if (patch.answer?.trim()) { data.answer = patch.answer.trim().slice(0, 2000); data.answeredAt = new Date().toISOString(); } await updateRecord(id, { status: data.answer ? 'done' : 'approved', data }); revalidatePath('/domande-al-comune'); revalidatePath('/admin/comunita'); return { ok: true, message: data.answer ? 'Risposta pubblicata.' : 'Domanda inoltrata: da oggi contiamo i giorni.' }; }
export async function verifyLogAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'log') return { ok: false, message: 'Voce non trovata.' }; await updateRecord(id, { data: { ...r.data, verified: r.data.verified ? '' : new Date().toISOString() } }); revalidatePath('/taccuino'); revalidatePath('/admin/comunita'); return { ok: true, message: r.data.verified ? 'Verifica tolta.' : 'Segnata come verificata sul posto.' }; }
/** Abbonamento sospeso: la redazione assegna uno degli abbonamenti pagati da altri. Chi lo riceve ha solo un codice, nessuno sa chi l'ha chiesto. */
export async function grantSuspendedAction(id: string): Promise<ActionResult> {
  await requirePermission('settings.manage'); const r = await findRecord<Record<string, string>>(id); const s = await getSettings(); const pool = s.commons?.suspendedPool ?? 0; if (!r || r.kind !== 'suspended-request' || r.status !== 'pending') return { ok: false, message: 'Richiesta non trovata.' }; if (pool < 1) return { ok: false, message: 'Non ci sono abbonamenti sospesi disponibili: aggiorna il numero quando arriva una donazione.' };
  const x3 = await import('./repo-extra3'); const code = `SOSPESO-${randomToken(5).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`; await x3.insertGift({ id: uid('gf'), code, email: r.data.email, months: 12, message: 'Abbonamento sospeso: qualcuno l\'ha pagato perché lo leggessi tu.', fromReader: '', redeemedBy: '', createdAt: new Date().toISOString(), redeemedAt: null });
  await repo.saveSettingsRow({ ...s, commons: { ...(s.commons ?? {}), suspendedPool: pool - 1 } }); revalidateTag('settings', 'max'); await updateRecord(id, { status: 'done', data: { granted: new Date().toISOString() } });
  const { mailConfigured, sendMail, mailLayout, esc } = await import('./mailer'); const mailed = (await mailConfigured()) && (await sendMail({ to: r.data.email, subject: `Un abbonamento a ${s.siteName} per te`, html: mailLayout(s.siteName, 'C\'è un abbonamento sospeso per te', `<p>Un lettore ha pagato un abbonamento per chi in questo momento non può. Questo è il tuo codice, vale dodici mesi:</p><p style="font-size:22px;font-weight:700;letter-spacing:1px">${esc(code)}</p><p>Inseriscilo in ${esc(siteUrl())}/account. Nessuno, oltre a te, sa che l'hai chiesto.</p>`) })).ok;
  revalidatePath('/admin/comunita'); revalidatePath('/abbonamento-sospeso'); return { ok: true, message: mailed ? 'Codice creato e inviato. La richiesta è stata anonimizzata.' : `Codice creato: ${code}. L'email non è configurata, invialo tu a ${r.data.email}.` };
}
export async function saveCommonsAction(c: CommonsSettings): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings(); const L = c.listening;
  const next: CommonsSettings = { suspendedPool: Math.max(0, Math.min(999, Math.round(c.suspendedPool ?? 0))), partners: (c.partners ?? []).filter((p) => p.name.trim()).slice(0, 60).map((p) => ({ name: p.name.trim().slice(0, 80), benefit: p.benefit.trim().slice(0, 160), address: p.address.trim().slice(0, 140) })), listening: L ? { enabled: !!L.enabled, weekday: Math.min(6, Math.max(0, Math.round(L.weekday))), time: /^\d{2}:\d{2}$/.test(L.time) ? L.time : '18:00', url: /^https:\/\//.test(L.url) ? L.url.slice(0, 300) : '', note: L.note.slice(0, 300) } : undefined };
  await repo.saveSettingsRow({ ...s, commons: next }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Salvato.' };
}
