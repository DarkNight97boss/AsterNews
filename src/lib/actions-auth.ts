'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { clearTwoFactorPending, clientIp, currentSession, endSession, getCurrentUser, readTwoFactorPending, requirePermission, requireUser, setTwoFactorPending, startSession } from './auth';
import * as repo from './repo';
import * as x from './repo-extra';
import { generateTotpSecret, hashPassword, passwordStrength, randomToken, totpUri, verifyPassword, verifyTotp } from './security';
import { getSettings } from './queries';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { ActionResult } from './actions';

const ok = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
const fail = (message: string): ActionResult => ({ ok: false, message });
async function audit(userId: string, action: string, target: string, details = ''): Promise<void> { await repo.insertActivity({ id: uid('ac'), userId, action, target, details, ip: await clientIp(), createdAt: new Date().toISOString() }); }

// Tentativi falliti per email (in memoria per istanza: rallenta gli attacchi a forza bruta)
const attempts = new Map<string, { n: number; until: number }>();
function throttled(key: string): number { const a = attempts.get(key); return a && a.until > Date.now() ? Math.ceil((a.until - Date.now()) / 1000) : 0; }
function noteFailure(key: string): void { const a = attempts.get(key) ?? { n: 0, until: 0 }; a.n++; if (a.n >= 5) { a.until = Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (a.n - 5)); } attempts.set(key, a); }

/** Login: password personale (o demo se l'utente non ne ha ancora una e la modalità demo è attiva), poi eventuale 2FA. */
export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirect') ?? '') || '/admin';
  const wait = throttled(email); if (wait) return fail(`Troppi tentativi. Riprova tra ${wait} secondi.`);
  const u = await repo.findUserByEmail(email);
  const secLog = async (kind: 'login_ok' | 'login_failed', userId: string) => { try { const { logSecurity } = await import('./security-log'); const h = await (await import('next/headers')).headers(); await logSecurity(kind, email, userId, (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || (await clientIp()), h.get('user-agent') ?? ''); } catch { /* ignora */ } };
  if (!u) { noteFailure(email); await secLog('login_failed', ''); return fail('Email o password errati.'); }
  if (!u.active) return fail('Account disattivato. Contatta un amministratore.');
  const hash = await x.passwordHashOf(u.id);
  const demoAllowed = !hash && process.env.DEMO_MODE === '1';
  const valid = hash ? verifyPassword(password, hash) : demoAllowed && password === 'aster2026';
  if (!valid) { noteFailure(email); await audit(u.id, 'accesso fallito per', u.email); return fail(hash ? 'Email o password errati.' : 'Questo account non ha ancora una password: chiedi a un amministratore di impostarla o usa "Password dimenticata".'); }
  attempts.delete(email);
  if (u.totpEnabled) { await setTwoFactorPending(u.id, redirectTo); redirect('/login/verifica'); }
  await startSession(u.id, 'staff'); await secLog('login_ok', u.id);
  await x.touchLogin(u.id);
  await audit(u.id, 'ha effettuato l\'accesso', u.email);
  redirect(u.mustChangePassword ? '/admin/profilo?cambia=1' : redirectTo.startsWith('/') ? redirectTo : '/admin');
}
export async function verifyTwoFactorAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const pending = await readTwoFactorPending();
  if (!pending) return fail('Sessione scaduta: ripeti l\'accesso.');
  const code = String(formData.get('code') ?? '');
  const secret = await x.totpSecretOf(pending.userId);
  if (!secret || !verifyTotp(secret, code)) { noteFailure('2fa:' + pending.userId); return fail('Codice non valido.'); }
  await clearTwoFactorPending();
  await startSession(pending.userId, 'staff');
  await x.touchLogin(pending.userId);
  await audit(pending.userId, 'ha effettuato l\'accesso (2FA)', '');
  redirect(pending.redirectTo.startsWith('/') ? pending.redirectTo : '/admin');
}
export async function logoutAction(): Promise<void> { const u = await getCurrentUser(); if (u) await audit(u.id, 'è uscito', u.email); await endSession('staff'); redirect('/login'); }

// ---------------- Profilo: password, 2FA, sessioni ----------------
export async function changePasswordAction(input: { current: string; next: string }): Promise<ActionResult> {
  const u = await requireUser();
  const hash = await x.passwordHashOf(u.id);
  if (hash && !verifyPassword(input.current, hash)) return fail('La password attuale non è corretta.');
  const st = passwordStrength(input.next); if (!st.ok) return fail(st.message);
  await x.setPassword(u.id, hashPassword(input.next), false);
  const s = await currentSession('staff'); await x.revokeAllSessions(u.id, s?.id ?? '');
  await audit(u.id, 'ha cambiato la password', u.email);
  return ok('Password aggiornata. Le altre sessioni sono state chiuse.');
}
export async function beginTotpAction(): Promise<{ secret: string; qr: string; uri: string }> {
  const u = await requireUser();
  const secret = generateTotpSecret();
  const uri = totpUri((await getSettings()).siteName, u.email, secret);
  await x.setTotp(u.id, secret, false);
  return { secret, uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }) };
}
export async function confirmTotpAction(code: string): Promise<ActionResult> {
  const u = await requireUser();
  const secret = await x.totpSecretOf(u.id);
  if (!secret || !verifyTotp(secret, code)) return fail('Codice non valido: controlla l\'ora del telefono e riprova.');
  await x.setTotp(u.id, secret, true);
  await audit(u.id, 'ha attivato la verifica in due passaggi', u.email);
  return ok('Verifica in due passaggi attiva.');
}
export async function disableTotpAction(password: string): Promise<ActionResult> {
  const u = await requireUser();
  const hash = await x.passwordHashOf(u.id);
  if (hash && !verifyPassword(password, hash)) return fail('Password errata.');
  await x.setTotp(u.id, null, false);
  await audit(u.id, 'ha disattivato la verifica in due passaggi', u.email);
  return ok('Verifica in due passaggi disattivata.');
}
export async function listMySessionsAction() { const u = await requireUser(); const cur = await currentSession('staff'); return (await x.listSessions(u.id)).map((s) => ({ ...s, current: s.id === cur?.id })); }
export async function revokeSessionAction(id: string): Promise<ActionResult> { const u = await requireUser(); const s = await x.findSession(id); if (!s || s.userId !== u.id) return fail('Sessione non trovata.'); await x.revokeSession(id); return ok('Sessione chiusa.'); }
export async function revokeOtherSessionsAction(): Promise<ActionResult> { const u = await requireUser(); const cur = await currentSession('staff'); await x.revokeAllSessions(u.id, cur?.id ?? ''); await audit(u.id, 'ha chiuso le altre sessioni', u.email); return ok('Tutte le altre sessioni sono state chiuse.'); }
export async function updateProfileAction(input: { name: string; bio: string; longBio: string; title: string; avatar: string; socials: Record<string, string> }): Promise<ActionResult> {
  const u = await requireUser();
  if (!input.name.trim()) return fail('Il nome è obbligatorio.');
  await repo.upsertUser({ ...u, name: input.name.trim(), bio: input.bio, longBio: input.longBio, title: input.title, avatar: input.avatar || u.avatar, socials: input.socials });
  return ok('Profilo aggiornato.');
}

// ---------------- Recupero password ----------------
export async function requestPasswordResetAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const wait = throttled('reset:' + email); if (wait) return fail(`Attendi ${wait} secondi prima di riprovare.`);
  noteFailure('reset:' + email);
  const u = await repo.findUserByEmail(email);
  const generic = ok('Se l\'indirizzo è registrato riceverai un\'email con le istruzioni.');
  if (!u || !u.active) return generic;
  if (!(await mailConfigured())) return fail('Il servizio email non è configurato: chiedi a un amministratore di generare un link di reset da Utenti e ruoli.');
  const token = randomToken(32);
  await x.deleteTokensFor('reset', u.id); await x.insertToken(token, 'reset', u.id, 60 * 60_000);
  const s = await getSettings(); const link = `${siteUrl()}/login/reimposta?token=${token}`;
  await sendMail({ to: u.email, subject: `Reimposta la password · ${s.siteName}`, html: mailLayout(s.siteName, 'Reimposta la password', `<p>Ciao ${esc(u.name)}, hai chiesto di reimpostare la password del tuo account in redazione.</p>${button(link, 'Scegli una nuova password')}<p>Il link vale un'ora. Se non hai fatto tu questa richiesta ignora questo messaggio.</p>`), text: `Reimposta la password: ${link}` });
  await audit(u.id, 'ha richiesto il reset della password', u.email);
  return generic;
}
export async function resetPasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get('token') ?? ''); const next = String(formData.get('password') ?? '');
  const st = passwordStrength(next); if (!st.ok) return fail(st.message);
  const t = await x.consumeToken(token, 'reset');
  if (!t) return fail('Link non valido o scaduto: richiedi un nuovo reset.');
  await x.setPassword(t.subject, hashPassword(next), false);
  await x.revokeAllSessions(t.subject);
  await audit(t.subject, 'ha reimpostato la password', '');
  (await cookies()).delete('aster_2fa');
  return ok('Password aggiornata: ora puoi accedere.');
}
/** Amministratore: imposta direttamente una password (o genera un link di reset da consegnare a mano). */
export async function adminSetPasswordAction(userId: string, password: string, mustChange = true): Promise<ActionResult> {
  const me = await requirePermission('user.manage');
  const st = passwordStrength(password); if (!st.ok) return fail(st.message);
  const u = await repo.findUser(userId); if (!u) return fail('Utente non trovato.');
  await x.setPassword(userId, hashPassword(password), mustChange);
  await x.revokeAllSessions(userId);
  await audit(me.id, 'ha impostato la password di', u.email);
  return ok(`Password impostata per ${u.name}.`);
}
export async function adminResetLinkAction(userId: string): Promise<ActionResult & { link?: string }> {
  const me = await requirePermission('user.manage');
  const u = await repo.findUser(userId); if (!u) return fail('Utente non trovato.');
  const token = randomToken(32);
  await x.deleteTokensFor('reset', userId); await x.insertToken(token, 'reset', userId, 24 * 60 * 60_000);
  await audit(me.id, 'ha generato un link di reset per', u.email);
  const link = `${siteUrl()}/login/reimposta?token=${token}`;
  if (await mailConfigured()) { const s = await getSettings(); await sendMail({ to: u.email, subject: `Imposta la tua password · ${s.siteName}`, html: mailLayout(s.siteName, 'Imposta la tua password', `<p>Ciao ${esc(u.name)}, un amministratore ti ha creato l'accesso alla redazione.</p>${button(link, 'Scegli la password')}<p>Il link vale 24 ore.</p>`), text: link }); }
  return { ok: true, message: 'Link generato (valido 24 ore).', link };
}
export async function adminDisableTotpAction(userId: string): Promise<ActionResult> { const me = await requirePermission('user.manage'); await x.setTotp(userId, null, false); await x.revokeAllSessions(userId); await audit(me.id, 'ha disattivato la 2FA di', userId); return ok('2FA disattivata e sessioni chiuse.'); }
export async function adminRevokeSessionsAction(userId: string): Promise<ActionResult> { const me = await requirePermission('user.manage'); await x.revokeAllSessions(userId); await audit(me.id, 'ha chiuso le sessioni di', userId); return ok('Sessioni chiuse.'); }
