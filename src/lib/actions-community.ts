'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getCurrentReader } from './auth';
import * as repo from './repo';
import * as x from './repo-extra';
import * as x3 from './repo-extra3';
import { DEFAULT_PAYWALL, type PaywallPlan } from './models';
import { getSettings } from './queries';
import { mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';
import { randomToken } from './security';
import { uid } from './utils';
import type { ActionResult } from './actions';

const fail = (message: string): ActionResult => ({ ok: false, message });
async function stripe(path: string, params: Record<string, string>, key: string): Promise<Record<string, unknown>> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const d = await r.json() as Record<string, unknown>; if (!r.ok) throw new Error(String((d.error as { message?: string })?.message ?? 'Errore Stripe')); return d;
}
export async function plansAction(): Promise<PaywallPlan[]> { const s = await getSettings(); return (s.paywall?.plans ?? []).filter((p) => p.stripePriceId); }
const pmParams = (methods: string[]) => Object.fromEntries(methods.map((m, i) => [`payment_method_types[${i}]`, m]));
/** Abbonamento a un piano (mensile, annuale, sostenitore…) oppure regalo: Stripe Checkout con i metodi di pagamento scelti. */
export async function startPlanCheckoutAction(planId: string, gift?: { email: string; message: string }): Promise<ActionResult & { url?: string }> {
  const reader = await getCurrentReader(); const s = await getSettings(); const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) };
  const key = pw.stripeSecretKey || process.env.STRIPE_SECRET_KEY || ''; const plan = (pw.plans ?? []).find((p) => p.id === planId);
  if (!pw.enabled || !key || !plan?.stripePriceId) return fail('Piano non disponibile.');
  if (!reader && !gift) return fail('Accedi o crea un account per abbonarti.');
  const methods = (pw.paymentMethods?.length ? pw.paymentMethods : ['card']).filter((m) => (gift || plan.interval === 'once') || m !== 'paypal' || true);
  try {
    const base: Record<string, string> = { 'line_items[0][price]': plan.stripePriceId, 'line_items[0][quantity]': '1', success_url: `${siteUrl()}/account?abbonamento=ok${gift ? '&regalo=1' : ''}`, cancel_url: `${siteUrl()}/account?abbonamento=annullato`, locale: 'it', ...pmParams(methods) };
    if (gift) { if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gift.email)) return fail('Email del destinatario non valida.'); const session = await stripe('checkout/sessions', { ...base, mode: 'payment', 'metadata[gift_email]': gift.email.trim().toLowerCase(), 'metadata[gift_plan]': plan.id, 'metadata[gift_message]': gift.message.slice(0, 200), 'metadata[gift_months]': String(plan.interval === 'year' ? 12 : 1), ...(reader ? { customer_email: reader.email, 'metadata[reader_id]': reader.id } : {}) }, key); return { ok: true, url: String(session.url) }; }
    const session = await stripe('checkout/sessions', { ...base, allow_promotion_codes: 'true', ...(plan.interval !== 'once' && plan.trialDays ? { 'subscription_data[trial_period_days]': String(Math.min(90, plan.trialDays)) } : {}), mode: plan.interval === 'once' ? 'payment' : 'subscription', client_reference_id: reader!.id, 'metadata[reader_id]': reader!.id, 'metadata[plan]': plan.id, ...(reader!.stripeCustomer ? { customer: reader!.stripeCustomer } : { customer_email: reader!.email }) }, key);
    return { ok: true, url: String(session.url) };
  } catch (e) { return fail((e as Error).message); }
}
/** Dopo il pagamento di un regalo (webhook): crea il codice e lo invia al destinatario. */
export async function createGiftCode(email: string, months: number, message: string, from: string): Promise<string> {
  const code = 'DONO-' + randomToken(4).toUpperCase().slice(0, 8); const s = await getSettings();
  await x3.insertGift({ id: uid('gf'), code, email, months, message, fromReader: from, redeemedBy: '', createdAt: new Date().toISOString(), redeemedAt: null });
  if (await mailConfigured()) await sendMail({ to: email, subject: `🎁 Ti hanno regalato ${s.siteName}`, html: mailLayout(s.siteName, 'Un abbonamento in regalo', `<p>Qualcuno ti ha regalato ${months} ${months === 1 ? 'mese' : 'mesi'} di ${s.siteName}.</p>${message ? `<blockquote>${message.replace(/</g, '&lt;')}</blockquote>` : ''}<p>Il tuo codice: <b style="font-size:20px">${code}</b></p><p><a href="${siteUrl()}/account?regalo=${code}">Attivalo nel tuo account</a> (basta registrarsi con questa email).</p>`) }).catch(() => {});
  return code;
}
export async function redeemGiftAction(code: string): Promise<ActionResult> {
  const limited = await (await import('./ratelimit')).guardRate('gift', 6, 600_000); if (limited) return fail(limited);
  const reader = await getCurrentReader(); if (!reader) return fail('Accedi o registrati per usare il codice.');
  const g = await x3.findGift(code.trim().toUpperCase()); if (!g) return fail('Codice non valido.'); if (g.redeemedAt) return fail('Codice già usato.');
  const from = reader.premiumUntil && reader.premiumUntil > new Date().toISOString() ? new Date(reader.premiumUntil) : new Date(); from.setMonth(from.getMonth() + g.months);
  await x.updateReader(reader.id, { premium: true, premiumUntil: from.toISOString() }); await x3.redeemGift(g.id, reader.id);
  revalidatePath('/account'); return { ok: true, message: `Regalo attivato: sei abbonato fino al ${from.toLocaleDateString('it-IT')}.` };
}
export async function setProfilePublicAction(pub: boolean): Promise<ActionResult> { const reader = await getCurrentReader(); if (!reader) return fail('Non autorizzato.'); await x3.savePrefs(reader.id, { ...(reader.prefs ?? {}), public: pub }); revalidatePath('/account'); return { ok: true, message: pub ? 'Profilo pubblico attivo.' : 'Profilo nascosto.' }; }
// ---------------- Quiz ----------------
export async function submitQuizAction(quizId: string, articleId: string, score: number, total: number, name: string): Promise<ActionResult & { rank?: number; players?: number }> {
  const limited = await (await import('./ratelimit')).guardRate('quiz', 10, 60_000); if (limited) return { ok: false, message: limited };
  if (!/^qz[a-z0-9]{4,12}$/.test(quizId) || total < 1 || total > 50) return { ok: false, message: 'Quiz non valido.' };
  const reader = await getCurrentReader(); const store = await cookies(); let anon = store.get('aster_vid')?.value; if (!anon) { anon = randomToken(12); store.set('aster_vid', anon, { path: '/', maxAge: 31536000, sameSite: 'lax', httpOnly: true }); }
  const who = reader?.id || `anon:${anon}`; const display = (reader?.name || name || 'Anonimo').slice(0, 40);
  await x3.upsertQuizResult({ id: uid('qr'), quizId, articleId, who, name: display, score: Math.max(0, Math.min(total, Math.round(score))), total, createdAt: new Date().toISOString() });
  const board = await x3.quizLeaderboard(quizId, 200); const rank = board.findIndex((b) => b.who === who) + 1;
  return { ok: true, message: 'Risultato salvato.', rank, players: board.length };
}
export async function quizLeaderboardAction(quizId: string): Promise<{ name: string; score: number; total: number }[]> { return (await x3.quizLeaderboard(quizId, 10)).map((b) => ({ name: b.name, score: b.score, total: b.total })); }
export async function readerCommentsAction(readerId: string): Promise<number> { return x3.countReaderComments(readerId); }
