'use server';

import { getCurrentReader } from './auth';
import * as x3 from './repo-extra3';
import { DEFAULT_DONATIONS, DEFAULT_PAYWALL, Donation } from './models';
import { getSettings } from './queries';
import { guardRate } from './ratelimit';
import { siteUrl } from './site-url';
import { uid } from './utils';
import { esc, mailConfigured, mailLayout, sendMail } from './mailer';
import type { ActionResult } from './actions';

/** Donazione una tantum con Stripe Checkout: importo libero o tra quelli proposti. */
export async function startDonationAction(input: { amount: number; name: string; email: string; message: string }): Promise<ActionResult & { url?: string }> {
  const s = await getSettings(); const d = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  if (!d.enabled) return { ok: false, message: 'Le donazioni non sono attive.' };
  const rl = await guardRate('donazione', 5); if (rl) return { ok: false, message: rl };
  const amount = Math.round(Math.max(1, Math.min(5000, Number(input.amount) || 0)) * 100) / 100;
  if (amount < 1) return { ok: false, message: 'Importo minimo 1 €.' };
  const pw = { ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) }; const key = pw.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
  if (!key) return { ok: false, message: 'Pagamenti non configurati: inserisci la chiave Stripe nelle Impostazioni.' };
  const reader = await getCurrentReader();
  const don: Donation = { id: uid('dn'), amount, name: input.name.trim().slice(0, 80), email: (input.email || reader?.email || '').trim().slice(0, 120), message: input.message.trim().slice(0, 500), status: 'pending', readerId: reader?.id ?? '', createdAt: new Date().toISOString(), paidAt: null };
  await x3.insertDonation(don);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mode: 'payment', ...(don.email ? { customer_email: don.email } : {}), 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), 'line_items[0][price_data][product_data][name]': `Sostegno a ${s.siteName}`, success_url: `${siteUrl()}/sostieni?grazie=1`, cancel_url: `${siteUrl()}/sostieni?annullato=1`, 'metadata[donation_id]': don.id, locale: 'it', submit_type: 'donate' }) });
  const data = await r.json() as { url?: string; error?: { message: string } };
  if (!r.ok || !data.url) return { ok: false, message: `Pagamento non disponibile: ${data.error?.message ?? r.status}` };
  return { ok: true, url: data.url };
}
export async function completeDonation(id: string): Promise<void> {
  import('./webhooks').then(async (w) => { const x3 = await import('./repo-extra3'); const d = (await x3.listDonations(50)).find((y) => y.id === id); if (d) w.dispatchWebhook('donation.paid', { id, amount: d.amount, name: d.name }); }).catch(() => {});
  const d = await x3.markDonationPaid(id); if (!d || !d.email || !(await mailConfigured())) return;
  const s = await getSettings(); const cfg = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  sendMail({ to: d.email, subject: `Grazie per il tuo sostegno · ${s.siteName}`, html: mailLayout(s.siteName, 'Grazie!', `<p>${esc(cfg.thanks)}</p><p>Contributo ricevuto: <b>${d.amount.toFixed(2).replace('.', ',')} €</b>.</p>`) }).catch(() => {});
}
