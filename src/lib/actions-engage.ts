'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentReader, requirePermission } from './auth';
import * as repo from './repo';
import * as x3 from './repo-extra3';
import { getSettings } from './queries';
import { guardRate } from './ratelimit';
import { randomToken } from './security';
import { siteUrl } from './site-url';
import { uid } from './utils';
import type { ActionResult } from './actions';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** «Segui questo argomento»: email a ogni nuovo articolo con quel tag (una al massimo per articolo). */
export async function followTagAction(tagId: string, email: string): Promise<ActionResult> {
  const limited = await guardRate('follow', 8, 600_000); if (limited) return { ok: false, message: limited };
  const reader = await getCurrentReader(); const mail = (reader?.email ?? email).trim().toLowerCase(); if (!EMAIL.test(mail)) return { ok: false, message: 'Inserisci un indirizzo email valido.' };
  const tags = await repo.listTags(5000); const t = tags.find((x) => x.id === tagId); if (!t) return { ok: false, message: 'Argomento non trovato.' };
  await x3.upsertFollow({ id: uid('fw'), tagId, email: mail, readerId: reader?.id ?? '', token: randomToken(16), createdAt: new Date().toISOString() });
  return { ok: true, message: `Ti scriveremo quando esce qualcosa su «${t.name}».` };
}
export async function unfollowTagAction(tagId: string): Promise<ActionResult> { const reader = await getCurrentReader(); if (!reader) return { ok: false, message: 'Accedi per gestire gli argomenti seguiti.' }; await x3.deleteFollow(tagId, reader.email); revalidatePath('/account/per-te'); return { ok: true, message: 'Non segui più questo argomento.' }; }
/** Segnalazione di un errore da parte di un lettore: arriva come nota all'autore, non viene pubblicata. */
export async function reportArticleErrorAction(articleId: string, quote: string, note: string): Promise<ActionResult> {
  const limited = await guardRate('errore-lettore', 4, 600_000); if (limited) return { ok: false, message: limited };
  if (note.trim().length < 5) return { ok: false, message: 'Spiega in due parole cosa non torna.' };
  const a = await repo.findArticle(articleId); if (!a || a.status !== 'published') return { ok: false, message: 'Articolo non trovato.' };
  const reader = await getCurrentReader(); const x = await import('./repo-extra');
  await x.insertNote({ id: uid('nt'), articleId, userId: '', kind: 'reader', body: `${reader ? reader.name || reader.email : 'Un lettore'} segnala: ${note.trim().slice(0, 1500)}`, resolved: false, createdAt: new Date().toISOString(), quote: quote.trim().slice(0, 400) });
  await x3.insertNotification({ id: uid('nt'), userId: a.authorId, kind: 'reader', text: `Un lettore segnala un possibile errore in «${a.title}»`, url: `/admin/articoli/${a.id}`, read: false, createdAt: new Date().toISOString() }).catch(() => {});
  return { ok: true, message: 'Grazie: la segnalazione è arrivata alla redazione.' };
}
// ---------------- Biglietti per gli eventi ----------------
export async function startTicketCheckoutAction(eventId: string, input: { name: string; email: string; qty: number }): Promise<ActionResult & { url?: string }> {
  const limited = await guardRate('biglietti', 6, 600_000); if (limited) return { ok: false, message: limited };
  const e = await repo.findEvent(eventId); if (!e || e.status !== 'published' || !e.ticketPrice) return { ok: false, message: 'Biglietti non disponibili per questo evento.' };
  const qty = Math.min(10, Math.max(1, Math.round(input.qty) || 1)); if (!EMAIL.test(input.email)) return { ok: false, message: 'Email non valida.' };
  if (e.ticketsTotal && (e.ticketsSold ?? 0) + qty > e.ticketsTotal) return { ok: false, message: `Restano solo ${Math.max(0, e.ticketsTotal - (e.ticketsSold ?? 0))} biglietti.` };
  const s = await getSettings(); const key = s.paywall?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || ''; if (!key) return { ok: false, message: 'Pagamenti non ancora attivi.' };
  const id = uid('tk'); const code = 'TKT-' + randomToken(5).toUpperCase().slice(0, 8);
  await x3.insertTicket({ id, eventId, name: input.name.trim().slice(0, 80), email: input.email.trim().toLowerCase(), qty, code, status: 'pending', amount: e.ticketPrice * qty, createdAt: new Date().toISOString(), usedAt: null });
  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mode: 'payment', 'line_items[0][quantity]': String(qty), 'line_items[0][price_data][currency]': 'eur', 'line_items[0][price_data][unit_amount]': String(Math.round(e.ticketPrice * 100)), 'line_items[0][price_data][product_data][name]': `Biglietto · ${e.title}`.slice(0, 120), customer_email: input.email.trim(), 'metadata[ticket_id]': id, success_url: `${siteUrl()}/eventi/${e.slug}?biglietto=ok`, cancel_url: `${siteUrl()}/eventi/${e.slug}?biglietto=annullato`, locale: 'it' }) });
    const d = await r.json() as { url?: string; error?: { message: string } }; if (!r.ok || !d.url) return { ok: false, message: d.error?.message ?? 'Errore Stripe' }; return { ok: true, url: d.url };
  } catch (err) { return { ok: false, message: (err as Error).message }; }
}
export async function checkInTicketAction(code: string): Promise<ActionResult> { await requirePermission('article.publish'); const t = await x3.findTicketByCode(code.trim().toUpperCase()); if (!t || t.status !== 'paid') return { ok: false, message: 'Codice non valido o non pagato.' }; if (t.usedAt) return { ok: false, message: `Già usato il ${new Date(t.usedAt).toLocaleString('it-IT')}.` }; await x3.useTicket(t.id); revalidatePath('/admin/eventi/biglietti'); return { ok: true, message: `Valido: ${t.qty} ingresso/i per ${t.name || t.email}.` }; }
