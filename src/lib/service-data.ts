import 'server-only';
import { followUpsFor } from './archive-data';
import { badgeLevel, guideStatus, remindersDue, type Deadline } from './service';
import { PARTICIPATION_KINDS } from './participation';
import { getCategories, getSettings } from './queries';
import { addRecord, findRecord, listRecords, updateRecord } from './records';
import * as repo from './repo';
import { findReader } from './repo-extra';
import { insertNotification } from './repo-extra3';
import { siteUrl } from './site-url';
import { articleUrlWith } from './queries';

export const listDeadlines = async (): Promise<Deadline[]> => (await listRecords<Deadline>('civic-deadline', { limit: 300 })).map((r) => ({ ...r.data, id: r.id }));
/** Promemoria civici: tre giorni prima di ogni scadenza, un'email a chi si è iscritto; una sola volta per scadenza e anno. */
export async function sendCivicReminders(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10); const due = remindersDue(await listDeadlines(), today, 3); if (!due.length) return '';
  const { mailConfigured, sendMail, mailLayout, esc } = await import('./mailer'); if (!(await mailConfigured())) return 'posta non configurata';
  const subs = await listRecords<{ email: string }>('promemoria', { status: 'approved', limit: 5000 }); if (!subs.length) return 'nessun iscritto'; const s = await getSettings(); let sent = 0;
  for (const { deadline, on } of due) { const key = `remsent_${deadline.id}_${on}`; if (await findRecord(key)) continue; await addRecord('reminder-sent', { id: key, ref: deadline.id, status: 'done', data: { on } }); for (const sub of subs) { await sendMail({ to: sub.data.email, subject: `Tra tre giorni: ${deadline.title}`, html: mailLayout(s.siteName, deadline.title, `<p>Scade il <b>${on}</b>.</p>${deadline.text ? `<p>${esc(deadline.text)}</p>` : ''}${deadline.url ? `<p><a href="${esc(deadline.url)}">Dove si fa</a></p>` : ''}<p style="color:#888;font-size:12px">Promemoria civici di ${s.siteName}: <a href="${siteUrl()}/promemoria">tutte le scadenze</a>.</p>`), listUnsubscribe: `${siteUrl()}/promemoria` }).catch(() => {}); sent++; } }
  return sent ? `${sent} promemoria inviati` : '';
}
/** Lista d'attesa: chi ha chiesto «avvisami se c'è un seguito» riceve un'email alla prima novità, poi esce dalla lista. */
export async function notifyWaitlists(): Promise<string> {
  const open = await listRecords<{ email: string }>('waitlist', { status: 'approved', limit: 2000 }); if (!open.length) return '';
  const { mailConfigured, sendMail, mailLayout, esc } = await import('./mailer'); if (!(await mailConfigured())) return ''; const [s, cats] = await Promise.all([getSettings(), getCategories()]); let sent = 0; const cache = new Map<string, Awaited<ReturnType<typeof followUpsFor>>>();
  for (const w of open) { const a = await repo.findArticle(w.ref); if (!a) { await updateRecord(w.id, { status: 'done' }); continue; } const after = cache.get(a.id) ?? (await followUpsFor(a)); cache.set(a.id, after); const fresh = after.filter((x) => (x.publishedAt ?? '') > w.createdAt); if (!fresh.length) continue; await sendMail({ to: w.data.email, subject: `C'è un seguito: ${a.title.slice(0, 60)}`, html: mailLayout(s.siteName, 'C\'è un seguito', `<p>Avevi chiesto di sapere se «${esc(a.title)}» avesse un seguito. Eccolo:</p><ul>${fresh.map((x) => `<li><a href="${siteUrl()}${articleUrlWith(x, cats)}">${esc(x.title)}</a></li>`).join('')}</ul>`) }).catch(() => {}); await updateRecord(w.id, { status: 'done' }); sent++; }
  return sent ? `${sent} avvisi di seguito inviati` : '';
}
/** Guide da riverificare: l'autore riceve una notifica quando la data di verifica è passata. */
export async function guidesDue(): Promise<{ article: import('./models').Article; status: ReturnType<typeof guideStatus> }[]> { const now = Date.now(); return (await repo.listArticles({ status: 'published', extraHas: 'guide' }, 'published', 500)).filter((a) => a.extra?.guide).map((a) => ({ article: a, status: guideStatus(a.extra!.guide!.verifiedAt, a.extra!.guide!.everyDays || 90, now) })).filter((x) => x.status.state !== 'ok'); }
export async function notifyGuidesDue(): Promise<string> { const due = await guidesDue(); const day = new Date().toISOString().slice(0, 10); let n = 0; for (const { article: a, status } of due) { if (new Date().getDay() !== 1) break; await insertNotification({ id: `nt_guide_${a.id}_${day.slice(0, 7)}`, userId: a.authorId, kind: 'guide', text: `La guida «${a.title.slice(0, 60)}» va riverificata (${status.state === 'never' ? 'mai verificata' : `${status.days} giorni dall'ultima verifica`})`, url: `/admin/articoli/${a.id}`, read: false, createdAt: new Date().toISOString() }).catch(() => {}); n++; } return n ? `${n} guide da riverificare segnalate` : ''; }
/** Lettori-corrispondenti: chi ha almeno tre contributi approvati, con il distintivo. */
export async function correspondents(): Promise<{ id: string; name: string; approved: number; badge: NonNullable<ReturnType<typeof badgeLevel>> }[]> {
  const counts = new Map<string, number>(); for (const k of PARTICIPATION_KINDS) for (const r of await listRecords(k.kind, { status: ['approved', 'done'], limit: 2000 })) if (r.owner) counts.set(r.owner, (counts.get(r.owner) ?? 0) + 1);
  const out: { id: string; name: string; approved: number; badge: NonNullable<ReturnType<typeof badgeLevel>> }[] = [];
  for (const [id, approved] of counts) { const b = badgeLevel(approved); if (!b) continue; const rd = await findReader(id); if (!rd || rd.banned) continue; out.push({ id, name: rd.name || 'Lettore', approved, badge: b }); }
  return out.sort((a, b) => b.approved - a.approved);
}
