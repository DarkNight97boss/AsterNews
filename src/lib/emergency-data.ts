import 'server-only';
import type { Closure } from './emergency';
import { getSettings } from './queries';
import { addRecord, listRecords } from './records';

export interface DiaryEntry { id: string; at: string; text: string; source: string; by: string; emergencyId: string }
export const listClosures = async (): Promise<Closure[]> => (await listRecords<Omit<Closure, 'id'>>('closure', { limit: 300 })).map((r) => ({ ...r.data, id: r.id, updatedAt: r.updatedAt }));
export const listDiary = async (emergencyId?: string, limit = 300): Promise<DiaryEntry[]> => (await listRecords<Omit<DiaryEntry, 'id'>>('emergency-diary', { ref: emergencyId, limit })).map((r) => ({ ...r.data, id: r.id }));
export const listOk = async (emergencyId: string) => (await listRecords<{ name: string; zone: string; message: string }>('sto-bene', { ref: emergencyId, status: 'approved', limit: 2000 })).map((r) => ({ id: r.id, name: r.data.name, zone: r.data.zone, message: r.data.message, createdAt: r.createdAt }));
export const listEmergencies = async () => (await listRecords<{ title: string; level?: string; from: string; to?: string; report?: string; sms?: number }>('emergency', { limit: 100 })).map((r) => ({ id: r.id, status: r.status, ...r.data }));
/** SMS a tutti gli iscritti al canale d'emergenza (Twilio o compatibile). Restituisce quanti sono partiti. */
export async function sendEmergencySms(body: string): Promise<{ sent: number; failed: number; error?: string }> {
  const sms = (await getSettings()).emergency?.sms; if (!sms?.sid || !sms.token || !sms.from) return { sent: 0, failed: 0, error: 'SMS non configurati (SID, token e numero in /admin/emergenze).' };
  const subs = await listRecords<{ phone: string }>('sms-emergenza', { status: 'approved', limit: 2000 }); if (!subs.length) return { sent: 0, failed: 0, error: 'Nessun iscritto.' };
  const auth = Buffer.from(`${sms.sid}:${sms.token}`).toString('base64'); let sent = 0, failed = 0;
  for (const s of subs) { try { const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sms.sid)}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: s.data.phone, From: sms.from, Body: body }) }); if (r.ok) sent++; else failed++; } catch { failed++; } }
  await addRecord('sms-sent', { status: 'done', data: { body, sent, failed } }); return { sent, failed };
}
