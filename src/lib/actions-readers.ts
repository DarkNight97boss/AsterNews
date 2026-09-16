'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { endSession, getCurrentReader, signedToken, startSession, verifySignedToken } from './auth';
import * as repo from './repo';
import * as x from './repo-extra';
import { Comment, DEFAULT_COMMUNITY, DEFAULT_PAYWALL, Reader } from './models';
import { getSettings } from './queries';
import { hashPassword, passwordStrength, randomToken, verifyPassword } from './security';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { subscribe as newsletterSubscribe } from './newsletter';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { ActionResult } from './actions';

const ok = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
const fail = (message: string): ActionResult => ({ ok: false, message });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ---------------- Newsletter (doppio opt-in) ----------------
export async function subscribeAction(email: string): Promise<ActionResult> { const r = await newsletterSubscribe(email, 'sito'); return r.ok ? ok(r.message) : fail(r.message); }

// ---------------- Account lettore ----------------
export async function registerReaderAction(input: { name: string; email: string; password: string; newsletter: boolean }): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return fail('Email non valida.');
  const st = passwordStrength(input.password); if (!st.ok) return fail(st.message);
  if (await x.findReaderByEmail(email)) return fail('Esiste già un account con questa email: accedi o recupera la password.');
  const mail = await mailConfigured();
  const r: Reader = { id: uid('rd'), email, name: input.name.trim().slice(0, 80), verified: !mail, premium: false, premiumUntil: null, stripeCustomer: '', banned: false, createdAt: new Date().toISOString(), lastLogin: null };
  await x.insertReader(r, hashPassword(input.password));
  if (input.newsletter) await newsletterSubscribe(email, 'account');
  if (mail) {
    const token = randomToken(24); await x.insertToken(token, 'reader-verify', r.id, 48 * 3600_000);
    const s = await getSettings(); const link = `${siteUrl()}/account/verifica?t=${token}`;
    await sendMail({ to: email, subject: `Conferma il tuo account · ${s.siteName}`, html: mailLayout(s.siteName, 'Conferma il tuo account', `<p>Ciao ${esc(r.name || '')}, grazie per esserti registrato su ${esc(s.siteName)}.</p>${button(link, 'Conferma l\'indirizzo email')}`), text: link });
    return ok('Account creato: controlla la posta e conferma l\'indirizzo email.');
  }
  await startSession(r.id, 'reader');
  return ok('Benvenuto! Account creato.');
}
export async function verifyReaderAction(token: string): Promise<boolean> { const t = await x.consumeToken(token, 'reader-verify'); if (!t) return false; await x.updateReader(t.subject, { verified: true }); await startSession(t.subject, 'reader'); return true; }
export async function loginReaderAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase(); const password = String(formData.get('password') ?? '');
  const r = await x.findReaderByEmail(email);
  if (!r || !verifyPassword(password, await x.readerPasswordHash(r.id))) return fail('Email o password errati.');
  if (r.banned) return fail('Account sospeso.');
  if (!r.verified) return fail('Devi prima confermare l\'indirizzo email (controlla la posta).');
  await startSession(r.id, 'reader'); await x.updateReader(r.id, { lastLogin: new Date().toISOString() });
  const back = String(formData.get('redirect') ?? '');
  redirect(back.startsWith('/') ? back : '/account');
}
export async function logoutReaderAction(): Promise<void> { await endSession('reader'); redirect('/'); }
export async function readerResetRequestAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const r = await x.findReaderByEmail(email); const generic = ok('Se l\'indirizzo è registrato riceverai un\'email.');
  if (!r || !(await mailConfigured())) return generic;
  const token = randomToken(24); await x.insertToken(token, 'reader-reset', r.id, 3600_000);
  const s = await getSettings(); const link = `${siteUrl()}/account/reimposta?t=${token}`;
  await sendMail({ to: email, subject: `Reimposta la password · ${s.siteName}`, html: mailLayout(s.siteName, 'Reimposta la password', `${button(link, 'Scegli una nuova password')}<p>Il link vale un'ora.</p>`), text: link });
  return generic;
}
export async function readerResetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get('token') ?? ''); const pw = String(formData.get('password') ?? '');
  const st = passwordStrength(pw); if (!st.ok) return fail(st.message);
  const t = await x.consumeToken(token, 'reader-reset'); if (!t) return fail('Link non valido o scaduto.');
  await x.updateReader(t.subject, { passwordHash: hashPassword(pw), verified: true });
  return ok('Password aggiornata: ora puoi accedere.');
}
export async function updateReaderAction(input: { name: string }): Promise<ActionResult> { const r = await getCurrentReader(); if (!r) return fail('Accedi prima.'); await x.updateReader(r.id, { name: input.name.trim().slice(0, 80) }); revalidatePath('/account'); return ok('Profilo aggiornato.'); }

// ---------------- Commenti: account, parole bloccate, segnalazioni ----------------
export async function addCommentAction(input: { articleId: string; authorName: string; email: string; body: string; parentId?: string }): Promise<ActionResult> {
  const a = await repo.findArticle(input.articleId);
  if (!a || !a.allowComments || a.status !== 'published') return fail('Commenti non disponibili.');
  const s = await getSettings(); const community = { ...DEFAULT_COMMUNITY, ...(s.community ?? {}) };
  const reader = await getCurrentReader();
  const { getCurrentUser } = await import('./auth'); const staffUser = await getCurrentUser();
  if (community.commentsRequireAccount && !reader && !staffUser) return fail('Per commentare devi accedere con un account lettore.');
  const authorName = staffUser ? staffUser.name : reader ? reader.name || reader.email.split('@')[0] : input.authorName.trim();
  const email = staffUser ? staffUser.email : reader ? reader.email : input.email.trim();
  const body = input.body.trim();
  if (!authorName || body.length < 3 || (!reader && !staffUser && !EMAIL.test(email))) return fail('Compila tutti i campi correttamente.');
  if (body.length > 2000) return fail('Massimo 2000 caratteri.');
  const blocked = community.blockedWords.split(/[\n,]/).map((w) => w.trim().toLowerCase()).filter(Boolean);
  const hasBlocked = blocked.some((w) => body.toLowerCase().includes(w));
  const linkSpam = (body.match(/https?:\/\//g) ?? []).length > 2;
  const status: Comment['status'] = staffUser ? 'approved' : hasBlocked || linkSpam ? 'spam' : s.commentsModeration && !reader?.premium ? 'pending' : 'approved';
  const c: Comment = { id: uid('cm'), articleId: a.id, authorName: authorName.slice(0, 60), email, body, status, createdAt: new Date().toISOString(), readerId: reader?.id ?? '', parentId: input.parentId ?? '', flags: 0, votes: 0, staff: !!staffUser };
  await repo.insertComment(c);
  (revalidateTag('articles', 'max'), revalidatePath('/', 'layout'));
  if (status === 'spam') return ok('Il commento è stato inviato alla moderazione.');
  return ok(status === 'pending' ? 'Grazie! Il commento sarà pubblicato dopo la moderazione.' : 'Commento pubblicato.');
}
export async function flagCommentAction(commentId: string): Promise<ActionResult> {
  const store = await cookies(); let voter = store.get('aster_vid')?.value;
  if (!voter) { voter = randomToken(12); store.set('aster_vid', voter, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true }); }
  const reader = await getCurrentReader();
  const flags = await x.flagComment(commentId, reader?.id ?? voter);
  const th = { ...DEFAULT_COMMUNITY, ...((await getSettings()).community ?? {}) }.flagsToHide;
  if (flags >= th) { await repo.setCommentStatus(commentId, 'pending'); (revalidateTag('articles', 'max'), revalidatePath('/', 'layout')); }
  return ok('Grazie per la segnalazione: la redazione controllerà il commento.');
}

// ---------------- Abbonamenti (Stripe Checkout via REST) ----------------
async function stripe(path: string, params: Record<string, string>, key: string): Promise<Record<string, unknown>> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const d = await r.json() as Record<string, unknown>;
  if (!r.ok) throw new Error(String((d.error as { message?: string })?.message ?? 'Errore Stripe'));
  return d;
}
export async function startCheckoutAction(): Promise<ActionResult & { url?: string }> {
  const reader = await getCurrentReader(); if (!reader) return fail('Accedi o crea un account per abbonarti.');
  const s = await getSettings(); const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) };
  const key = pw.stripeSecretKey || process.env.STRIPE_SECRET_KEY || ''; const price = pw.stripePriceId || process.env.STRIPE_PRICE_ID || '';
  if (!pw.enabled || !key || !price) return fail('Gli abbonamenti non sono ancora attivi.');
  try {
    const session = await stripe('checkout/sessions', { mode: 'subscription', 'line_items[0][price]': price, 'line_items[0][quantity]': '1', customer_email: reader.stripeCustomer ? '' : reader.email, ...(reader.stripeCustomer ? { customer: reader.stripeCustomer } : {}), client_reference_id: reader.id, success_url: `${siteUrl()}/account?abbonamento=ok`, cancel_url: `${siteUrl()}/account?abbonamento=annullato`, 'metadata[reader_id]': reader.id, locale: 'it' }, key);
    return { ok: true, url: String(session.url) };
  } catch (e) { return fail((e as Error).message); }
}
export async function customerPortalAction(): Promise<ActionResult & { url?: string }> {
  const reader = await getCurrentReader(); if (!reader?.stripeCustomer) return fail('Nessun abbonamento attivo.');
  const s = await getSettings(); const key = s.paywall?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
  try { const p = await stripe('billing_portal/sessions', { customer: reader.stripeCustomer, return_url: `${siteUrl()}/account` }, key); return { ok: true, url: String(p.url) }; } catch (e) { return fail((e as Error).message); }
}
/** Contatore articoli gratuiti (paywall soft): cookie firmato con mese e conteggio. */
export async function meterAction(articleId: string): Promise<{ allowed: boolean; left: number; premiumRequired: boolean }> {
  const s = await getSettings(); const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) };
  if (!pw.enabled) return { allowed: true, left: 999, premiumRequired: false };
  const reader = await getCurrentReader();
  if (reader?.premium) return { allowed: true, left: 999, premiumRequired: false };
  const a = await repo.findArticle(articleId);
  if (a?.premium) return { allowed: false, left: 0, premiumRequired: true };
  const store = await cookies(); const month = new Date().toISOString().slice(0, 7);
  const raw = store.get('aster_meter')?.value; const id = await verifySignedToken(raw);
  let [m, n, seen] = (id ?? '').split('|'); let count = m === month ? Number(n) || 0 : 0; const ids = m === month && seen ? seen.split(',') : [];
  if (!ids.includes(articleId)) { if (count >= pw.freeArticles) return { allowed: false, left: 0, premiumRequired: false }; count++; ids.push(articleId); }
  m = month;
  store.set('aster_meter', await signedToken(`${m}|${count}|${ids.slice(-50).join(',')}`), { path: '/', maxAge: 60 * 60 * 24 * 40, sameSite: 'lax', httpOnly: true });
  return { allowed: true, left: Math.max(0, pw.freeArticles - count), premiumRequired: false };
}

// ---------------- Amministrazione lettori ----------------
export async function adminUpdateReaderAction(id: string, patch: { banned?: boolean; premium?: boolean; verified?: boolean }): Promise<ActionResult> {
  const { requirePermission } = await import('./auth');
  await requirePermission('comment.moderate');
  await x.updateReader(id, { ...patch, ...(patch.premium !== undefined ? { premiumUntil: null } : {}) });
  revalidatePath('/admin/lettori');
  return ok('Lettore aggiornato.');
}

// ---------------- Magic link (accesso senza password) ----------------
export async function requestMagicLinkAction(email: string, back = '/account'): Promise<ActionResult> {
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e)) return fail('Email non valida.');
  if (!(await mailConfigured())) return fail('Accesso via email non disponibile: il servizio email non è configurato.');
  let r = await x.findReaderByEmail(e);
  if (!r) { r = { id: uid('rd'), email: e, name: '', verified: false, premium: false, premiumUntil: null, stripeCustomer: '', banned: false, createdAt: new Date().toISOString(), lastLogin: null }; await x.insertReader(r, null); }
  if (r.banned) return fail('Account sospeso.');
  const token = randomToken(24); await x.insertToken(token, 'reader-magic', r.id, 15 * 60_000, back);
  const s = await getSettings(); const link = `${siteUrl()}/account/magic?t=${token}&back=${encodeURIComponent(back)}`;
  await sendMail({ to: e, subject: `Il tuo link di accesso · ${s.siteName}`, html: mailLayout(s.siteName, 'Accedi con un clic', `<p>Ecco il tuo link di accesso a ${esc(s.siteName)}. Vale 15 minuti e funziona una sola volta.</p>${button(link, 'Accedi')}`), text: link });
  return ok('Ti abbiamo inviato un link di accesso: controlla la posta.');
}
export async function magicLoginAction(token: string): Promise<boolean> {
  const t = await x.consumeToken(token, 'reader-magic'); if (!t) return false;
  const r = await x.findReader(t.subject); if (!r || r.banned) return false;
  await x.updateReader(r.id, { verified: true, lastLogin: new Date().toISOString() });
  await startSession(r.id, 'reader');
  return true;
}

// ---------------- Preferiti, preferenze, voti, privacy ----------------
export async function toggleBookmarkAction(articleId: string): Promise<{ ok: boolean; saved?: boolean; message?: string }> {
  const r = await getCurrentReader(); if (!r) return { ok: false, message: 'Accedi per salvare gli articoli.' };
  const x3 = await import('./repo-extra3'); const saved = await x3.toggleBookmark(r.id, articleId);
  return { ok: true, saved, message: saved ? 'Salvato tra i tuoi articoli.' : 'Rimosso dai salvati.' };
}
export async function savePrefsAction(prefs: { zones: string[]; tags: string[]; categories: string[] }): Promise<ActionResult> {
  const r = await getCurrentReader(); if (!r) return fail('Accedi prima.');
  const x3 = await import('./repo-extra3'); await x3.savePrefs(r.id, { zones: prefs.zones.slice(0, 20), tags: prefs.tags.slice(0, 30), categories: prefs.categories.slice(0, 20) });
  revalidatePath('/account/per-te'); return ok('Preferenze salvate.');
}
export async function voteCommentAction(commentId: string): Promise<{ ok: boolean; votes?: number; voted?: boolean; message?: string }> {
  const store = await cookies(); let voter = store.get('aster_vid')?.value;
  if (!voter) { voter = randomToken(12); store.set('aster_vid', voter, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true }); }
  const reader = await getCurrentReader(); const x3 = await import('./repo-extra3');
  const r = await x3.voteComment(commentId, reader?.id ?? voter);
  return { ok: true, ...r };
}
export async function exportMyDataAction(): Promise<string> { const r = await getCurrentReader(); if (!r) return ''; const x3 = await import('./repo-extra3'); return JSON.stringify(await x3.exportReaderData(r.id), null, 1); }
export async function deleteMyAccountAction(password: string): Promise<ActionResult> {
  const r = await getCurrentReader(); if (!r) return fail('Accedi prima.');
  const hash = await x.readerPasswordHash(r.id);
  if (hash && !verifyPassword(password, hash)) return fail('Password errata.');
  const x3 = await import('./repo-extra3'); await x3.deleteReaderData(r.id, r.email); await endSession('reader');
  return ok('Account eliminato. I tuoi commenti restano anonimi.');
}
