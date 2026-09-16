'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentReader, requirePermission } from './auth';
import * as x2 from './repo-extra2';
import { Ad, DEFAULT_LISTINGS, DEFAULT_PAYWALL, Listing, ListingKind } from './models';
import { getSettings } from './queries';
import { siteUrl } from './site-url';
import { uid } from './utils';
import { esc, mailConfigured, mailLayout, sendMail } from './mailer';
import type { ActionResult } from './actions';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export async function listingsSettings() { return { ...DEFAULT_LISTINGS, ...((await getSettings()).listings ?? {}) }; }

/** Un lettore (o un visitatore con email) propone un annuncio o un necrologio; se previsto un pagamento, torna l'URL del checkout Stripe. */
export async function submitListingAction(input: { kind: ListingKind; title: string; body: string; image: string; category: string; price: string; contactName: string; contactEmail: string; contactPhone: string; zoneId: string; extra?: Record<string, string> }): Promise<ActionResult & { checkoutUrl?: string }> {
  const s = await listingsSettings(); if (!s.enabled) return { ok: false, message: 'Servizio non attivo.' };
  if (!input.title.trim() || input.body.trim().length < 10) return { ok: false, message: 'Inserisci titolo e testo (almeno 10 caratteri).' };
  if (!EMAIL.test(input.contactEmail.trim())) return { ok: false, message: 'Email di contatto non valida.' };
  const reader = await getCurrentReader();
  const amount = input.kind === 'necrologio' ? s.priceNecrologio : s.priceAnnuncio;
  const free = amount <= 0 || (s.freeForReaders && !!reader);
  const l: Listing = { id: uid('ls'), kind: input.kind, title: input.title.trim().slice(0, 140), body: input.body.trim().slice(0, 4000), image: input.image.startsWith('http') || input.image.startsWith('data:image/') ? input.image.slice(0, 2_000_000) : '', category: input.category.slice(0, 60), price: input.price.slice(0, 40), contactName: input.contactName.trim().slice(0, 80), contactEmail: input.contactEmail.trim(), contactPhone: input.contactPhone.slice(0, 40), zoneId: input.zoneId, status: 'pending', paid: free, amount: free ? 0 : amount, expiresAt: new Date(Date.now() + s.days * 86400000).toISOString(), readerId: reader?.id ?? '', createdAt: new Date().toISOString(), publishedAt: null, extra: input.extra ?? {} };
  if (free && !s.moderation) { l.status = 'published'; l.publishedAt = l.createdAt; }
  await x2.upsertListing(l);
  if (!free) {
    const site = await getSettings(); const pw = { ...DEFAULT_PAYWALL, ...(site.paywall ?? {}) };
    const key = pw.stripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
    if (!key) return { ok: true, message: 'Richiesta ricevuta: la redazione ti contatterà per il pagamento.', id: l.id };
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mode: 'payment', customer_email: l.contactEmail, 'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), 'line_items[0][price_data][product_data][name]': `${input.kind === 'necrologio' ? 'Necrologio' : 'Annuncio'}: ${l.title.slice(0, 60)}`, success_url: `${siteUrl()}/annunci/nuovo?pagato=1`, cancel_url: `${siteUrl()}/annunci/nuovo?annullato=1`, 'metadata[listing_id]': l.id, locale: 'it' }) });
    const d = await r.json() as { url?: string; error?: { message: string } };
    if (!r.ok || !d.url) return { ok: false, message: `Pagamento non disponibile: ${d.error?.message ?? r.status}` };
    return { ok: true, message: 'Vai al pagamento sicuro.', id: l.id, checkoutUrl: d.url };
  }
  revalidatePath('/annunci'); revalidatePath('/necrologi');
  return { ok: true, message: s.moderation ? 'Ricevuto! Sarà pubblicato dopo il controllo della redazione.' : 'Pubblicato.', id: l.id };
}
export async function markListingPaid(id: string): Promise<void> { const l = await x2.findListing(id); if (!l) return; const s = await listingsSettings(); await x2.updateListingStatus(id, s.moderation ? 'pending' : 'published', true); revalidatePath('/annunci'); if (await mailConfigured()) { const site = await getSettings(); sendMail({ to: l.contactEmail, subject: `Pagamento ricevuto · ${site.siteName}`, html: mailLayout(site.siteName, 'Grazie!', `<p>Abbiamo ricevuto il pagamento per «${esc(l.title)}». ${s.moderation ? 'Il testo sarà pubblicato dopo il controllo della redazione.' : 'È già online.'}</p>`) }).catch(() => {}); } }

// ---------------- Redazione ----------------
export async function setListingStatusAction(id: string, status: Listing['status']): Promise<ActionResult> { await requirePermission('comment.moderate'); await x2.updateListingStatus(id, status); revalidatePath('/annunci'); revalidatePath('/necrologi'); revalidatePath('/admin/annunci'); return { ok: true, message: 'Aggiornato.' }; }
export async function deleteListingAction(id: string): Promise<ActionResult> { await requirePermission('comment.moderate'); await x2.deleteListing(id); revalidatePath('/admin/annunci'); return { ok: true, message: 'Eliminato.' }; }
export async function saveListingAction(l: Listing): Promise<ActionResult> { await requirePermission('comment.moderate'); await x2.upsertListing({ ...l, id: l.id || uid('ls'), createdAt: l.createdAt || new Date().toISOString() }); revalidatePath('/annunci'); revalidatePath('/necrologi'); revalidatePath('/admin/annunci'); return { ok: true, message: 'Salvato.' }; }

// ---------------- Pubblicità ----------------
export async function saveAdAction(a: Ad): Promise<ActionResult> { await requirePermission('settings.manage'); if (!a.name.trim() || !a.slot) return { ok: false, message: 'Nome e posizione sono obbligatori.' }; await x2.upsertAd({ ...a, id: a.id || uid('ad'), createdAt: a.createdAt || new Date().toISOString() }); revalidatePath('/', 'layout'); return { ok: true, message: 'Annuncio salvato.' }; }
export async function deleteAdAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); await x2.deleteAd(id); revalidatePath('/', 'layout'); return { ok: true, message: 'Annuncio eliminato.' }; }
