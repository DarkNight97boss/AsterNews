'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { clientIp, getCurrentUser, requirePermission, requireUser } from './auth';
import * as repo from './repo';
import * as x from './repo-extra';
import { Article, ArticleNote, Poll, Revision } from './models';
import { can, canEdit } from './permissions';
import { getSettings } from './queries';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { ActionResult } from './actions';

const ok = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
const fail = (message: string): ActionResult => ({ ok: false, message });
async function log(userId: string, action: string, a: Article, details = ''): Promise<void> { await repo.insertActivity({ id: uid('ac'), userId, action, target: a.title, articleId: a.id, details, ip: await clientIp(), createdAt: new Date().toISOString() }); }

// ---------------- Revisioni ----------------
export async function listRevisionsAction(articleId: string): Promise<Revision[]> {
  const u = await requireUser(); const a = await repo.findArticle(articleId);
  if (!a || !canEdit(u, a)) return [];
  return x.listRevisions(articleId);
}
export async function restoreRevisionAction(revisionId: string): Promise<ActionResult> {
  const u = await requireUser();
  const rev = await x.findRevision(revisionId); if (!rev) return fail('Revisione non trovata.');
  const current = await repo.findArticle(rev.articleId); if (!current || !canEdit(u, current)) return fail('Non puoi modificare questo articolo.');
  await x.insertRevision({ id: uid('rv'), articleId: current.id, userId: u.id, note: 'prima del ripristino', data: current, createdAt: new Date().toISOString() });
  const restored: Article = { ...rev.data, id: current.id, status: current.status, views: current.views, publishedAt: current.publishedAt, updatedAt: new Date().toISOString() };
  await repo.upsertArticle(restored);
  await log(u.id, 'ha ripristinato una revisione di', current, new Date(rev.createdAt).toLocaleString('it-IT'));
  (revalidateTag('articles', 'max'), revalidatePath('/', 'layout'));
  return ok('Revisione ripristinata.');
}

// ---------------- Autosalvataggio e blocco modifica ----------------
export async function autosaveAction(a: Article): Promise<{ ok: boolean; at?: string; holder?: string }> {
  const u = await getCurrentUser(); if (!u) return { ok: false };
  const existing = await repo.findArticle(a.id);
  if (existing && !canEdit(u, existing)) return { ok: false };
  const lock = await x.acquireLock(a.id, u.id);
  if (!lock.ok) return { ok: false, holder: lock.holder };
  await x.saveAutosave(a.id, u.id, a);
  return { ok: true, at: new Date().toISOString() };
}
export async function discardAutosaveAction(articleId: string): Promise<void> { const u = await getCurrentUser(); if (u) await x.deleteAutosave(articleId); }
export async function lockHeartbeatAction(articleId: string): Promise<{ ok: boolean; holder?: string; holderName?: string; since?: string }> {
  const u = await getCurrentUser(); if (!u) return { ok: false };
  const r = await x.acquireLock(articleId, u.id);
  if (r.ok) return { ok: true };
  const holder = r.holder ? await repo.findUser(r.holder) : undefined;
  return { ok: false, holder: r.holder, holderName: holder?.name, since: r.since };
}
export async function releaseLockAction(articleId: string): Promise<void> { const u = await getCurrentUser(); if (u) await x.releaseLock(articleId, u.id); }

// ---------------- Note interne, richiesta modifiche, assegnazione ----------------
export async function addNoteAction(articleId: string, body: string, kind: ArticleNote['kind'] = 'note'): Promise<ActionResult> {
  const u = await requireUser(); const a = await repo.findArticle(articleId);
  if (!a || !(canEdit(u, a) || can(u, 'article.publish'))) return fail('Operazione non consentita.');
  if (!body.trim()) return fail('Scrivi un testo.');
  const n: ArticleNote = { id: uid('nt'), articleId, userId: u.id, kind, body: body.trim().slice(0, 4000), resolved: false, createdAt: new Date().toISOString() };
  await x.insertNote(n);
  if (kind === 'changes') {
    await repo.patchArticle(articleId, { status: 'draft', updated_at: n.createdAt });
    await log(u.id, 'ha richiesto modifiche a', a, body.slice(0, 200));
    await notifyAuthor(a, u.name, `Richiesta di modifiche: ${a.title}`, `<p><b>${esc(u.name)}</b> chiede modifiche all'articolo «${esc(a.title)}»:</p><blockquote style="border-left:3px solid #d7262d;padding-left:12px;color:#444">${esc(body)}</blockquote>`);
  } else await log(u.id, 'ha lasciato una nota su', a, body.slice(0, 120));
  revalidatePath(`/admin/articoli/${articleId}`);
  return ok(kind === 'changes' ? 'Richiesta inviata: l\'articolo torna in bozza.' : 'Nota aggiunta.', n.id);
}
export async function resolveNoteAction(noteId: string, resolved: boolean): Promise<ActionResult> { await requireUser(); await x.resolveNote(noteId, resolved); return ok(); }
export async function deleteNoteAction(noteId: string): Promise<ActionResult> { await requirePermission('article.publish'); await x.deleteNote(noteId); return ok('Nota eliminata.'); }
export async function listNotesAction(articleId: string): Promise<ArticleNote[]> { const u = await getCurrentUser(); if (!u) return []; return x.listNotes(articleId); }
export async function assignArticleAction(articleId: string, assignedTo: string, deadline: string | null): Promise<ActionResult> {
  const u = await requirePermission('article.assign'); const a = await repo.findArticle(articleId); if (!a) return fail('Articolo non trovato.');
  await repo.patchArticle(articleId, { assigned_to: assignedTo, deadline: deadline || null });
  const who = assignedTo ? await repo.findUser(assignedTo) : undefined;
  await log(u.id, who ? `ha assegnato a ${who.name}` : 'ha rimosso l\'assegnazione di', a, deadline ? `scadenza ${new Date(deadline).toLocaleString('it-IT')}` : '');
  if (who && who.id !== u.id) await inApp(who.id, 'assign', `${u.name} ti ha assegnato «${a.title}»${deadline ? ` (scadenza ${new Date(deadline).toLocaleDateString('it-IT')})` : ''}`, `/admin/articoli/${a.id}`);
  if (who && who.id !== u.id) await notifyUser(who.email, who.name, `Ti è stato assegnato: ${a.title}`, `<p>${esc(u.name)} ti ha assegnato l'articolo «${esc(a.title)}»${deadline ? ` con scadenza ${esc(new Date(deadline).toLocaleString('it-IT'))}` : ''}.</p>`, `/admin/articoli/${a.id}`);
  revalidatePath('/admin', 'layout');
  return ok(who ? `Assegnato a ${who.name}.` : 'Assegnazione rimossa.');
}
async function notifyAuthor(a: Article, from: string, subject: string, html: string): Promise<void> { const author = await repo.findUser(a.authorId); if (author) { await inApp(author.id, 'changes', subject, `/admin/articoli/${a.id}`); await notifyUser(author.email, author.name, subject, html, `/admin/articoli/${a.id}`); } }
async function inApp(userId: string, kind: string, text: string, url: string): Promise<void> { const x3 = await import('./repo-extra3'); await x3.insertNotification({ id: uid('nf'), userId, kind, text, url, read: false, createdAt: new Date().toISOString() }); }
async function notifyUser(email: string, name: string, subject: string, html: string, path: string): Promise<void> {
  if (!(await mailConfigured())) return;
  const s = await getSettings();
  await sendMail({ to: email, subject: `${subject} · ${s.siteName}`, html: mailLayout(s.siteName, subject, `<p>Ciao ${esc(name)},</p>${html}${button(siteUrl() + path, 'Apri in redazione')}`) }).catch(() => {});
}

// ---------------- Calendario editoriale ----------------
export async function calendarArticlesAction(from: string, to: string): Promise<Article[]> { const u = await getCurrentUser(); if (!u) return []; return x.articlesBetween(from, to); }
export async function moveScheduleAction(articleId: string, iso: string): Promise<ActionResult> {
  const u = await requireUser(); const a = await repo.findArticle(articleId); if (!a || !canEdit(u, a)) return fail('Operazione non consentita.');
  const nowIso = new Date().toISOString();
  if (a.status === 'published') { if (!can(u, 'article.publish')) return fail('Non puoi cambiare la data di pubblicazione.'); await x.setSchedule(a.id, null, iso); }
  else if (a.status === 'scheduled' || (a.status === 'draft' && iso > nowIso && can(u, 'article.publish'))) { await x.setSchedule(a.id, iso, a.publishedAt); if (a.status !== 'scheduled') await repo.patchArticle(a.id, { status: 'scheduled' }); }
  else await repo.patchArticle(a.id, { deadline: iso });
  await log(u.id, 'ha spostato nel calendario', a, new Date(iso).toLocaleString('it-IT'));
  (revalidateTag('articles', 'max'), revalidatePath('/', 'layout'));
  return ok('Data aggiornata.');
}

// ---------------- Sondaggi ----------------
export async function createPollAction(articleId: string, question: string, options: string[]): Promise<ActionResult & { poll?: Poll }> {
  const u = await requireUser(); if (!can(u, 'article.create')) return fail('Non consentito.');
  const opts = options.map((o) => o.trim()).filter(Boolean).slice(0, 8);
  if (!question.trim() || opts.length < 2) return fail('Servono una domanda e almeno due risposte.');
  const p: Poll = { id: uid('pl'), articleId, question: question.trim().slice(0, 200), options: opts, votes: opts.map(() => 0), createdAt: new Date().toISOString() };
  await x.upsertPoll(p);
  return { ok: true, poll: p };
}
export async function votePollAction(pollId: string, option: number): Promise<{ ok: boolean; poll?: Poll; message?: string }> {
  const store = await cookies(); const key = `poll_${pollId}`;
  if (store.get(key)) return { ok: false, message: 'Hai già votato.', poll: await x.findPoll(pollId) };
  const p = await x.votePoll(pollId, option);
  if (!p) return { ok: false, message: 'Sondaggio non trovato.' };
  store.set(key, String(option), { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  return { ok: true, poll: p };
}
export async function getPollAction(pollId: string): Promise<{ poll?: Poll; voted: number | null }> { const store = await cookies(); const v = store.get(`poll_${pollId}`)?.value; return { poll: await x.findPoll(pollId), voted: v === undefined ? null : Number(v) }; }
