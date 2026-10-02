import 'server-only';
import { stripCircles } from './circles';
import { stripAuthorNotes } from './content-render';
import { chainOk, depositHash, followUps, withoutFollowUp } from './archive';
import { archiveDays, archiveMonths } from './insights';
import type { Article } from './models';
import { getSettings } from './queries';
import { addRecord, listRecords } from './records';
import * as repo from './repo';

export interface Deposit { date: string; n: number; hash: string; prev: string; bytes: number; url?: string; at: string }
export const listDeposits = async (limit = 400) => (await listRecords<Deposit>('deposit', { limit, order: 'new' })).map((r) => r.data);
/** Fascicolo di un giorno: tutto ciò che era pubblicato quel giorno, in forma riproducibile (niente date di generazione). */
export async function depositBundle(date: string): Promise<{ json: string; n: number }> {
  const s = await getSettings(); const [cats, users] = await Promise.all([repo.listCategories(), repo.listUsers()]);
  const list = (await repo.listArticles({ status: 'published', from: `${date}T00:00:00.000Z`, to: `${date}T23:59:59.999Z` }, 'published', 500)).sort((a, b) => a.id.localeCompare(b.id));
  const articles = list.map((a) => ({ id: a.id, slug: a.slug, title: a.title, subtitle: a.subtitle, kicker: a.kicker, category: cats.find((c) => c.id === a.categoryId)?.name ?? '', author: users.find((u) => u.id === a.authorId)?.name ?? '', publishedAt: a.publishedAt, updatedAt: a.updatedAt, content: stripAuthorNotes(stripCircles(a.content)), coverImage: a.coverImage, signature: a.extra?.signature ?? null, corrections: a.extra?.corrections ?? [] }));
  return { json: JSON.stringify({ site: s.siteName, date, articles }), n: articles.length };
}
/** Deposito legale digitale: ogni notte i giorni non ancora depositati (fino a 30 per volta) ricevono un'impronta concatenata; il fascicolo va nello storage e, se configurato, all'archivio via email. */
export async function legalDeposit(force = false): Promise<string> {
  const s = await getSettings(); const cfg = s.archive ?? {}; if (!cfg.depositEnabled && !force) return '';
  const done = await listDeposits(5000); const last = done.sort((a, b) => b.date.localeCompare(a.date))[0]; const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const months = (await archiveMonths()).map((m) => m.month).sort(); if (!months.length) return 'nessun articolo';
  const days: string[] = []; for (const m of months) for (const d of await archiveDays(m)) if (d.day <= yesterday && (!last || d.day > last.date)) days.push(d.day);
  days.sort(); const todo = days.slice(0, 30); if (!todo.length) return 'deposito aggiornato';
  let prev = last?.hash ?? ''; const { mailConfigured, sendMail, mailLayout } = await import('./mailer'); const mailOk = cfg.depositEmail ? await mailConfigured() : false;
  for (const date of todo) {
    const { json, n } = await depositBundle(date); const hash = await depositHash(prev, json); let url: string | undefined;
    try { const { uploadRaw } = await import('./storage'); url = await uploadRaw(Buffer.from(json), `deposito/${date}.json`, 'application/json'); if (url.startsWith('data:')) url = undefined; } catch { /* storage non disponibile: resta l'impronta */ }
    const dep: Deposit = { date, n, hash, prev, bytes: Buffer.byteLength(json), url, at: new Date().toISOString() };
    await addRecord('deposit', { id: `dep_${date}`, ref: date, status: 'done', data: dep });
    if (mailOk && cfg.depositEmail) await sendMail({ to: cfg.depositEmail, subject: `Deposito legale ${s.siteName} · ${date}`, html: mailLayout(s.siteName, `Deposito del ${date}`, `<p>${n} articoli. Impronta SHA-256: <code>${hash}</code><br/>Precedente: <code>${prev || '(inizio della catena)'}</code></p>`), attachments: [{ filename: `deposito-${date}.json`, content: Buffer.from(json).toString('base64'), type: 'application/json' }] }).catch(() => {});
    prev = hash;
  }
  return `${todo.length} giorni depositati${days.length > 30 ? ` (${days.length - 30} restano per domani)` : ''}`;
}
export async function verifyChain(): Promise<{ ok: boolean; brokenAt: string | null; n: number }> { const d = await listDeposits(5000); return { ...chainOk(d), n: d.length }; }
/** Articoli successivi sullo stesso argomento, per «Cosa è successo dopo». */
export async function followUpsFor(a: Article): Promise<Article[]> { if (!a.tagIds.length || !a.publishedAt) return []; const pool: Article[] = []; for (const t of a.tagIds.slice(0, 4)) pool.push(...(await repo.listArticles({ status: 'published', tagId: t, from: a.publishedAt }, 'published', 60))); const seen = new Set<string>(); return followUps(a, pool.filter((x) => !seen.has(x.id) && seen.add(x.id))); }
export async function storiesWithoutFollowUp(): Promise<Article[]> { const all = await repo.listArticles({ status: 'published' }, 'views', 1500); const dismissed = new Set((await listRecords('followup-dismissed', { limit: 2000 })).map((r) => r.ref)); return withoutFollowUp(all.filter((a) => !dismissed.has(a.id)), Date.now()); }
