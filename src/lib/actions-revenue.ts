'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentReader, requirePermission } from './auth';
import * as repo from './repo';
import * as x2 from './repo-extra2';
import * as x3 from './repo-extra3';
import { AD_SLOTS, DEFAULT_PAYWALL } from './models';
import { getSettings } from './queries';
import { guardRate } from './ratelimit';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { ActionResult } from './actions';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
async function stripe(path: string, params: Record<string, string>, key: string): Promise<Record<string, unknown>> { const r = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) }); const d = await r.json() as Record<string, unknown>; if (!r.ok) throw new Error(String((d.error as { message?: string })?.message ?? 'Errore Stripe')); return d; }
const stripeKey = async () => { const s = await getSettings(); return s.paywall?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || ''; };

/** Pubblicità self-service: l'inserzionista sceglie spazio e periodo, indica banner e link, paga. L'annuncio parte dopo l'approvazione della redazione. */
export async function startAdOrderAction(input: { slot: string; startAt: string; days: number; image: string; url: string; company: string; email: string }): Promise<ActionResult & { url?: string }> {
  const limited = await guardRate('ad-order', 5, 600_000); if (limited) return { ok: false, message: limited };
  const s = await getSettings(); const cfg = s.adSales; if (!cfg?.enabled) return { ok: false, message: 'La vendita online degli spazi non è attiva.' };
  const slot = AD_SLOTS.find((x) => x.id === input.slot); const price = cfg.prices?.[input.slot] ?? 0; if (!slot || !price) return { ok: false, message: 'Spazio non disponibile.' };
  const days = Math.min(90, Math.max(1, Math.round(input.days) || 7)); if (!EMAIL.test(input.email)) return { ok: false, message: 'Email non valida.' };
  if (!/^https:\/\//.test(input.image) || !/^https?:\/\//.test(input.url)) return { ok: false, message: 'Servono l\'indirizzo https del banner e il link di destinazione.' };
  const start = /^\d{4}-\d{2}-\d{2}$/.test(input.startAt) ? new Date(input.startAt + 'T00:00:00') : new Date(); const end = new Date(start.getTime() + days * 86400000);
  const key = await stripeKey(); if (!key) return { ok: false, message: 'Pagamenti non ancora attivi.' };
  const adId = uid('ad'); const orderId = uid('ao'); const amount = Math.round(price * days * 100) / 100;
  await x2.upsertAd({ id: adId, slot: slot.id, name: `[self-service] ${input.company.trim().slice(0, 50) || input.email}`, type: 'image', image: input.image, url: input.url, html: '', label: s.ads?.label || 'Pubblicità', startAt: start.toISOString(), endAt: end.toISOString(), weight: 1, impressions: 0, clicks: 0, active: false, createdAt: new Date().toISOString() });
  await x3.insertAdOrder({ id: orderId, adId, company: input.company.trim().slice(0, 80), email: input.email.trim().toLowerCase(), amount, days, status: 'pending', createdAt: new Date().toISOString() });
  try { const ses = await stripe('checkout/sessions', { mode: 'payment', 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), 'line_items[0][price_data][product_data][name]': `${slot.name} · ${days} giorni`, customer_email: input.email.trim(), 'invoice_creation[enabled]': 'true', 'metadata[ad_order_id]': orderId, success_url: `${siteUrl()}/pubblicita?ordine=ok`, cancel_url: `${siteUrl()}/pubblicita?ordine=annullato`, locale: 'it' }, key); return { ok: true, url: String(ses.url) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function completeAdOrder(orderId: string): Promise<void> {
  const o = await x3.markAdOrderPaid(orderId); if (!o) return; const s = await getSettings();
  const admins = (await repo.listUsers()).filter((u) => u.role === 'admin' && u.active); for (const a of admins) await x3.insertNotification({ id: uid('nt'), userId: a.id, kind: 'ads', text: `💶 Nuovo ordine pubblicitario pagato (${o.amount.toFixed(2)} €) da ${o.company || o.email}: approvalo in Pubblicità`, url: '/admin/pubblicita', read: false, createdAt: new Date().toISOString() }).catch(() => {});
  const { mailConfigured, mailLayout, sendMail } = await import('./mailer'); if (await mailConfigured()) await sendMail({ to: o.email, subject: `Ordine ricevuto · ${s.siteName}`, html: mailLayout(s.siteName, 'Grazie per l\'ordine', `<p>Abbiamo ricevuto il pagamento di ${o.amount.toFixed(2)} €. La redazione verifica il banner e lo mette online nel periodo scelto: ti avvisiamo alla partenza.</p>`) }).catch(() => {});
}
export async function saveAdSalesAction(cfg: { enabled: boolean; prices: Record<string, number>; note: string }): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); const prices: Record<string, number> = {}; for (const sl of AD_SLOTS) prices[sl.id] = Math.max(0, Number(cfg.prices?.[sl.id]) || 0); await repo.saveSettingsRow({ ...s, adSales: { enabled: !!cfg.enabled, prices, note: cfg.note.slice(0, 600) } }); revalidateTag('settings', 'max'); revalidatePath('/pubblicita'); return { ok: true, message: 'Listino salvato.' }; }

/** Abbonamenti aziendali: N posti con fattura unica; al pagamento arrivano N codici da distribuire ai colleghi. */
export async function startTeamCheckoutAction(planId: string, input: { seats: number; company: string; email: string }): Promise<ActionResult & { url?: string }> {
  const limited = await guardRate('team', 5, 600_000); if (limited) return { ok: false, message: limited };
  const s = await getSettings(); const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) }; const plan = (pw.plans ?? []).find((p) => p.id === planId); const key = await stripeKey();
  if (!pw.enabled || !key || !plan) return { ok: false, message: 'Piano non disponibile.' }; const seats = Math.min(500, Math.max(2, Math.round(input.seats) || 2)); if (!EMAIL.test(input.email)) return { ok: false, message: 'Email non valida.' };
  const months = plan.interval === 'year' ? 12 : 1; const unit = Math.round(plan.price * (seats >= 20 ? 0.8 : seats >= 5 ? 0.9 : 1) * 100);
  try { const ses = await stripe('checkout/sessions', { mode: 'payment', 'line_items[0][quantity]': String(seats), 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(unit), 'line_items[0][price_data][product_data][name]': `${plan.name} · abbonamento aziendale (${months} ${months === 1 ? 'mese' : 'mesi'})`, customer_email: input.email.trim(), 'invoice_creation[enabled]': 'true', 'metadata[team_seats]': String(seats), 'metadata[team_months]': String(months), 'metadata[team_email]': input.email.trim().toLowerCase(), 'metadata[team_company]': input.company.trim().slice(0, 80), success_url: `${siteUrl()}/account?abbonamento=ok&azienda=1`, cancel_url: `${siteUrl()}/account?abbonamento=annullato`, locale: 'it' }, key); return { ok: true, url: String(ses.url) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function completeTeamOrder(m: { team_seats: string; team_months: string; team_email: string; team_company?: string }): Promise<void> {
  const seats = Math.min(500, Number(m.team_seats) || 0); const months = Number(m.team_months) || 1; if (!seats) return; const { randomToken } = await import('./security'); const codes: string[] = [];
  for (let i = 0; i < seats; i++) { const code = 'TEAM-' + randomToken(5).toUpperCase().slice(0, 8); codes.push(code); await x3.insertGift({ id: uid('gf'), code, email: m.team_email, months, message: m.team_company ?? '', fromReader: '', redeemedBy: '', createdAt: new Date().toISOString(), redeemedAt: null }); }
  const s = await getSettings(); const { mailConfigured, mailLayout, sendMail } = await import('./mailer');
  if (await mailConfigured()) await sendMail({ to: m.team_email, subject: `I ${seats} accessi di ${s.siteName} per ${m.team_company || 'la tua azienda'}`, html: mailLayout(s.siteName, 'Abbonamento aziendale attivo', `<p>Ecco i ${seats} codici (validi ${months} ${months === 1 ? 'mese' : 'mesi'} ciascuno). Ogni collega si registra su <a href="${siteUrl()}/account">${siteUrl()}/account</a> e inserisce il proprio codice.</p><pre style="font-size:15px;line-height:1.8">${codes.join('\n')}</pre><p>La fattura arriva da Stripe a questo indirizzo.</p>`) }).catch(() => {});
}
/** Email di recupero per gli abbonati che non leggono più. */
export async function sendWinbackAction(readerIds: string[]): Promise<ActionResult> {
  await requirePermission('comment.moderate'); const { churnRisk } = await import('./insights'); const risk = (await churnRisk(200)).filter((r) => readerIds.includes(r.id)).slice(0, 100); if (!risk.length) return { ok: false, message: 'Nessun destinatario.' };
  const { mailConfigured, mailLayout, sendMail } = await import('./mailer'); if (!(await mailConfigured())) return { ok: false, message: 'Posta in uscita non configurata.' };
  const s = await getSettings(); const top = await repo.listArticles({ status: 'published' }, 'views', 5); const cats = await repo.listCategories(); let n = 0;
  for (const r of risk) { const res = await sendMail({ to: r.email, subject: `${r.name ? r.name.split(' ')[0] + ', c' : 'C'}i sei mancato su ${s.siteName}`, html: mailLayout(s.siteName, 'Cosa ti sei perso', `<p>È un po' che non passi: ecco gli articoli più letti dagli abbonati in questi giorni.</p><ul>${top.map((a) => `<li><a href="${siteUrl()}/${cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}">${a.title}</a></li>`).join('')}</ul><p>Se qualcosa non ti convince del tuo abbonamento, rispondi a questa email: leggiamo tutto.</p>`) }); if (res.ok) n++; }
  return { ok: true, message: `${n} email di recupero inviate.` };
}
export async function isLoggedReader(): Promise<boolean> { return !!(await getCurrentReader()); }
