'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentReader, requirePermission } from './auth';
import { guardRate } from './ratelimit';
import { addRecord, deleteRecord, findRecord, listRecords, updateRecord } from './records';
import * as repo from './repo';
import { shiftStats, type Deadline } from './service';
import { uid } from './utils';
import type { ActionResult } from './actions';

/** Sondaggio deliberativo: voto «prima» e voto «dopo» aver letto le ragioni; l'identità è un gettone del browser. */
export async function delibVoteAction(articleId: string, voterId: string, stage: 'before' | 'after', vote: 'si' | 'no'): Promise<ActionResult & { stats?: ReturnType<typeof shiftStats> }> {
  if (await guardRate('delib', 20, 600_000)) return { ok: false, message: 'Riprova più tardi.' }; if (!/^[\w-]{6,40}$/.test(voterId) || !['si', 'no'].includes(vote)) return { ok: false, message: 'Voto non valido.' };
  const a = await repo.findArticle(articleId); if (!a?.extra?.deliberation || a.status !== 'published') return { ok: false, message: 'Sondaggio non attivo.' };
  const id = `dv_${articleId}_${voterId}`.slice(0, 120); const cur = await findRecord<{ before?: string; after?: string }>(id); const data = { ...(cur?.data ?? {}), [stage]: vote }; if (stage === 'after' && !data.before) return { ok: false, message: 'Prima il voto iniziale.' };
  await addRecord('delib-vote', { id, ref: articleId, status: 'done', data }); return { ok: true, stats: await delibStatsAction(articleId) };
}
export async function delibStatsAction(articleId: string): Promise<ReturnType<typeof shiftStats>> { return shiftStats((await listRecords<{ before?: string; after?: string }>('delib-vote', { ref: articleId, limit: 5000 })).map((r) => r.data)); }
/** Domanda alla redazione: la risposta diventa pubblica. */
export async function answerQuestionAction(id: string, answer: string, publish: boolean): Promise<ActionResult> { const u = await requirePermission('article.publish'); const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'domanda') return { ok: false, message: 'Domanda non trovata.' }; if (answer.trim().length < 10) return { ok: false, message: 'Serve una risposta.' }; await updateRecord(id, { status: publish ? 'done' : 'approved', data: { ...r.data, answer: answer.trim().slice(0, 4000), answeredBy: u.name, answeredAt: new Date().toISOString() } }); const { mailConfigured, sendMail, mailLayout, esc } = await import('./mailer'); if (r.data.email && (await mailConfigured())) await sendMail({ to: r.data.email, subject: 'La redazione ti risponde', html: mailLayout('', 'La tua domanda', `<p><i>${esc(r.data.text)}</i></p><p>${esc(answer).replace(/\n/g, '<br/>')}</p>`) }).catch(() => {}); revalidatePath('/domande'); revalidatePath('/admin/servizio'); return { ok: true, message: publish ? 'Risposta pubblicata e inviata.' : 'Risposta inviata in privato.' }; }
export async function saveDeadlineAction(d: Deadline): Promise<ActionResult> { await requirePermission('article.publish'); if (d.title.trim().length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return { ok: false, message: 'Servono titolo e data.' }; await addRecord('civic-deadline', { id: d.id || uid('dl'), status: 'approved', data: { title: d.title.trim().slice(0, 120), date: d.date, yearly: !!d.yearly, text: d.text.slice(0, 600), url: d.url.slice(0, 300) } }); revalidatePath('/promemoria'); revalidatePath('/admin/servizio'); return { ok: true, message: 'Scadenza salvata.' }; }
export async function deleteDeadlineAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); await deleteRecord(id); revalidatePath('/promemoria'); revalidatePath('/admin/servizio'); return { ok: true, message: 'Eliminata.' }; }
/** Silenzia un argomento: resta nel browser, e nel profilo se il lettore è collegato. */
export async function muteTagAction(tagId: string, muted: boolean): Promise<ActionResult> { const r = await getCurrentReader(); if (!r) return { ok: true }; const cur = r.prefs?.mutedTags ?? []; const next = muted ? [...new Set([...cur, tagId])].slice(0, 50) : cur.filter((x) => x !== tagId); const x3 = await import('./repo-extra3'); await x3.savePrefs(r.id, { ...(r.prefs ?? {}), mutedTags: next }); return { ok: true }; }
export async function mutedTagsAction(): Promise<string[]> { const r = await getCurrentReader(); return r?.prefs?.mutedTags ?? []; }
