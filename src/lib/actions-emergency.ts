'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import { CLOSURE_LABELS, emergencyReport, smsText, type AlertLevel, type Closure } from './emergency';
import { listClosures, listDiary, listOk, sendEmergencySms } from './emergency-data';
import { getSettings } from './queries';
import { addRecord, deleteRecord, findRecord, listRecords, updateRecord } from './records';
import * as repo from './repo';
import { insertNotification } from './repo-extra3';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { ActionResult } from './actions';

/** Modalità allerta: banner rosso su tutto il sito, pagina /emergenza, avviso ai giornalisti (reperibili per primi), push ai lettori. */
export async function setAlertAction(a: { active: boolean; title: string; text: string; level: AlertLevel }): Promise<ActionResult> {
  const u = await requirePermission('article.publish'); const s = await getSettings(); const cur = s.emergency ?? {}; const now = new Date().toISOString();
  if (a.active) {
    if (a.title.trim().length < 4) return { ok: false, message: 'Serve un titolo (es. Allerta meteo rossa).' };
    const emergencyId = cur.active && cur.emergencyId ? cur.emergencyId : uid('em'); if (!cur.active) await addRecord('emergency', { id: emergencyId, status: 'open', data: { title: a.title.trim(), level: a.level, from: now } });
    await repo.saveSettingsRow({ ...s, emergency: { ...cur, active: true, title: a.title.trim().slice(0, 120), text: a.text.trim().slice(0, 600), level: a.level, since: cur.active ? cur.since : now, emergencyId } });
    if (!cur.active) {
      const today = now.slice(0, 10); const onCall = new Set((await listRecords<{ date: string; userId: string; kind: string }>('shift', { limit: 500 })).filter((x) => x.data.date === today && x.data.kind === 'reperibile').map((x) => x.data.userId));
      const { mailConfigured, sendMail, mailLayout, esc } = await import('./mailer'); const mailOk = await mailConfigured();
      for (const x of await repo.listUsers()) { if (!x.active) continue; await insertNotification({ id: uid('nf'), userId: x.id, kind: 'emergency', text: `🚨 ${onCall.has(x.id) ? 'SEI DI REPERIBILITÀ · ' : ''}Modalità allerta attivata da ${u.name}: ${a.title.trim().slice(0, 120)}`, url: '/admin/emergenze', read: false, createdAt: now }); if (mailOk && onCall.has(x.id)) await sendMail({ to: x.email, subject: `🚨 Sei di reperibilità: ${a.title.trim().slice(0, 60)}`, html: mailLayout(s.siteName, 'Modalità allerta', `<p>${esc(a.text || a.title)}</p><p><a href="${siteUrl()}/admin/emergenze">Vai alla sala emergenze</a></p>`) }).catch(() => {}); }
      try { const { pushEnabled, sendPush } = await import('./push'); if (await pushEnabled()) await sendPush({ title: `🚨 ${a.title.trim().slice(0, 60)}`, body: a.text.trim().slice(0, 120) || 'Aggiornamenti, chiusure e «sto bene» sul sito.', url: '/emergenza', tag: 'emergenza' }); } catch { /* push non attivo */ }
    }
  } else if (cur.active) {
    // Dopo l'emergenza: resoconto automatico, fascicolo, chiusura
    const id = cur.emergencyId ?? ''; const rec = id ? await findRecord<{ title: string; level?: string; from: string }>(id) : undefined;
    if (rec) { const [diary, closures, ok, sms] = await Promise.all([listDiary(id), listClosures(), listOk(id), listRecords<{ sent: number }>('sms-sent', { limit: 200 })]); const smsSent = sms.filter((x) => x.createdAt >= rec.data.from).reduce((n, x) => n + (x.data.sent ?? 0), 0); const report = emergencyReport({ ...rec.data, to: now }, diary.map((d) => ({ at: d.at, text: d.text, source: d.source })), closures.filter((c) => c.updatedAt >= rec.data.from), ok.length, smsSent); await updateRecord(id, { status: 'done', data: { ...rec.data, to: now, report, sms: smsSent } }); await addRecord('dossier', { id: `dos_${id}`, owner: u.id, status: 'open', data: { title: `Emergenza: ${rec.data.title}`, slug: '', tagId: '', people: '', timeline: diary.map((d) => `${d.at.slice(0, 16).replace('T', ' ')}, ${d.text}${d.source ? `, ${d.source}` : ''}`).join('\n'), docs: '', notes: report, status: 'aperto' } }); }
    await repo.saveSettingsRow({ ...s, emergency: { ...cur, active: false, since: undefined, emergencyId: undefined } });
  }
  revalidateTag('settings', 'max'); revalidatePath('/'); revalidatePath('/emergenza'); revalidatePath('/emergenze'); revalidatePath('/admin/emergenze');
  return { ok: true, message: a.active ? (cur.active ? 'Allerta aggiornata.' : 'Modalità allerta attivata: redazione avvisata, push inviata.') : 'Allerta chiusa: resoconto e fascicolo creati.' };
}
export async function diaryAddAction(text: string, source: string): Promise<ActionResult> { const u = await requirePermission('article.publish'); if (text.trim().length < 5) return { ok: false, message: 'Scrivi l\'aggiornamento.' }; const s = await getSettings(); await addRecord('emergency-diary', { ref: s.emergency?.emergencyId ?? '', owner: u.id, status: 'approved', data: { at: new Date().toISOString(), text: text.trim().slice(0, 600), source: source.trim().slice(0, 120), by: u.name, emergencyId: s.emergency?.emergencyId ?? '' } }); revalidatePath('/emergenza'); revalidatePath('/admin/emergenze'); return { ok: true, message: 'Aggiornamento pubblicato.' }; }
export async function diaryDeleteAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); await deleteRecord(id); revalidatePath('/emergenza'); revalidatePath('/admin/emergenze'); return { ok: true, message: 'Eliminato.' }; }
export async function closureSaveAction(c: Omit<Closure, 'updatedAt'>): Promise<ActionResult> { await requirePermission('article.publish'); if (!(c.kind in CLOSURE_LABELS) || c.name.trim().length < 2) return { ok: false, message: 'Servono tipo e nome.' }; await addRecord('closure', { id: c.id || uid('cl'), status: 'approved', data: { kind: c.kind, name: c.name.trim().slice(0, 120), status: c.status, until: c.until.slice(0, 10), note: c.note.slice(0, 300) } }); revalidatePath('/chiusure'); revalidatePath('/emergenza'); revalidatePath('/admin/emergenze'); return { ok: true, message: 'Chiusura salvata.' }; }
export async function closureDeleteAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); await deleteRecord(id); revalidatePath('/chiusure'); revalidatePath('/admin/emergenze'); return { ok: true, message: 'Eliminata.' }; }
/** Segnalazione di chiusura accolta → diventa una chiusura. */
export async function acceptClosureReportAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'chiusura-segnalata') return { ok: false, message: 'Non trovata.' }; await addRecord('closure', { status: 'approved', data: { kind: (r.data.kind in CLOSURE_LABELS ? r.data.kind : 'altro'), name: r.data.name.slice(0, 120), status: 'chiuso', until: '', note: (r.data.note ?? '').slice(0, 300) } }); await updateRecord(id, { status: 'done' }); revalidatePath('/chiusure'); revalidatePath('/admin/emergenze'); return { ok: true, message: 'Chiusura aggiunta.' }; }
export async function chainVerdictAction(id: string, verdict: 'vero' | 'falso' | 'in-parte' | 'non-verificabile', note: string): Promise<ActionResult> { const u = await requirePermission('article.publish'); const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'catena') return { ok: false, message: 'Non trovata.' }; if (note.trim().length < 10) return { ok: false, message: 'Spiega in due righe cosa avete verificato.' }; await updateRecord(id, { status: 'done', data: { ...r.data, verdict, note: note.trim().slice(0, 1500), by: u.name, verifiedAt: new Date().toISOString() } }); revalidatePath('/catene'); revalidatePath('/admin/emergenze'); return { ok: true, message: 'Verifica pubblicata.' }; }
export async function saveSmsSettingsAction(sms: { sid: string; token: string; from: string }): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); const cur = s.emergency?.sms; await repo.saveSettingsRow({ ...s, emergency: { ...(s.emergency ?? {}), sms: { sid: sms.sid.trim(), token: sms.token.trim() || cur?.token || '', from: sms.from.trim() } } }); revalidateTag('settings', 'max'); return { ok: true, message: 'SMS configurati.' }; }
export async function sendSmsAction(text: string): Promise<ActionResult> { await requirePermission('article.publish'); if (text.trim().length < 10) return { ok: false, message: 'Scrivi il messaggio.' }; const s = await getSettings(); const r = await sendEmergencySms(smsText(s.siteName, text, `${siteUrl()}/emergenza`)); revalidatePath('/admin/emergenze'); return r.error ? { ok: false, message: r.error } : { ok: true, message: `SMS inviati: ${r.sent}${r.failed ? `, falliti: ${r.failed}` : ''}.` }; }
