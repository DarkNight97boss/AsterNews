import 'server-only';
import { revalidatePath } from 'next/cache';
import * as repo from './repo';
import * as x from './repo-extra';
import * as x2 from './repo-extra2';
import * as x3 from './repo-extra3';
import { getSettings } from './queries';
import { DEFAULT_DONATIONS, DEFAULT_LISTINGS, DEFAULT_PAYWALL } from './models';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { siteUrl } from './site-url';
import { randomToken } from './security';
import { uid } from './utils';

const listingsSettings = async () => ({ ...DEFAULT_LISTINGS, ...((await getSettings()).listings ?? {}) });

/**
 * Completamento dei pagamenti e creazione dei codici regalo. Vive fuori dai file 'use server': queste funzioni le chiama solo il webhook
 * di Stripe (con firma verificata) o altro codice del server, e non devono mai essere raggiungibili dal browser come azioni.
 */
/** Dopo il pagamento di un regalo (webhook): crea il codice e lo invia al destinatario. */
export async function createGiftCode(email: string, months: number, message: string, from: string): Promise<string> {
  const code = 'DONO-' + randomToken(4).toUpperCase().slice(0, 8); const s = await getSettings();
  await x3.insertGift({ id: uid('gf'), code, email, months, message, fromReader: from, redeemedBy: '', createdAt: new Date().toISOString(), redeemedAt: null });
  if (await mailConfigured()) await sendMail({ to: email, subject: `🎁 Ti hanno regalato ${s.siteName}`, html: mailLayout(s.siteName, 'Un abbonamento in regalo', `<p>Qualcuno ti ha regalato ${months} ${months === 1 ? 'mese' : 'mesi'} di ${s.siteName}.</p>${message ? `<blockquote>${message.replace(/</g, '&lt;')}</blockquote>` : ''}<p>Il tuo codice: <b style="font-size:20px">${code}</b></p><p><a href="${siteUrl()}/account?regalo=${code}">Attivalo nel tuo account</a> (basta registrarsi con questa email).</p>`) }).catch(() => {});
  return code;
}

export async function completeDonation(id: string): Promise<void> {
  import('./webhooks').then(async (w) => { const x3 = await import('./repo-extra3'); const d = (await x3.listDonations(50)).find((y) => y.id === id); if (d) w.dispatchWebhook('donation.paid', { id, amount: d.amount, name: d.name }); }).catch(() => {});
  const d = await x3.markDonationPaid(id); if (!d || !d.email || !(await mailConfigured())) return;
  const s = await getSettings(); const cfg = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  sendMail({ to: d.email, subject: `Grazie per il tuo sostegno · ${s.siteName}`, html: mailLayout(s.siteName, 'Grazie!', `<p>${esc(cfg.thanks)}</p><p>Contributo ricevuto: <b>${d.amount.toFixed(2).replace('.', ',')} €</b>.</p>`) }).catch(() => {});
}

/** Chiamata dal webhook Stripe: conferma il biglietto, aggiorna i venduti e invia il codice. */
export async function completeTicket(ticketId: string): Promise<void> {
  const t = await x3.markTicketPaid(ticketId); if (!t) return; const e = await repo.findEvent(t.eventId); if (!e) return;
  await repo.addTicketsSold(e.id, t.qty);
  const { mailConfigured, mailLayout, sendMail } = await import('./mailer'); const s = await getSettings();
  if (await mailConfigured()) await sendMail({ to: t.email, subject: `Il tuo biglietto · ${e.title}`, html: mailLayout(s.siteName, 'Biglietto confermato', `<p>Ciao ${t.name || ''}, il pagamento è andato a buon fine.</p><p><b>${e.title}</b><br>${e.place} ${e.address}<br>${e.dateFrom}${e.timeInfo ? ' · ' + e.timeInfo : ''}</p><p>Biglietti: <b>${t.qty}</b><br>Codice da mostrare all'ingresso: <b style="font-size:22px">${t.code}</b></p>`) }).catch(() => {});
}

export async function markListingPaid(id: string): Promise<void> { const l = await x2.findListing(id); if (!l) return; const s = await listingsSettings(); await x2.updateListingStatus(id, s.moderation ? 'pending' : 'published', true); revalidatePath('/annunci'); if (await mailConfigured()) { const site = await getSettings(); sendMail({ to: l.contactEmail, subject: `Pagamento ricevuto · ${site.siteName}`, html: mailLayout(site.siteName, 'Grazie!', `<p>Abbiamo ricevuto il pagamento per «${esc(l.title)}». ${s.moderation ? 'Il testo sarà pubblicato dopo il controllo della redazione.' : 'È già online.'}</p>`) }).catch(() => {}); } }

export async function completeAdOrder(orderId: string): Promise<void> {
  const o = await x3.markAdOrderPaid(orderId); if (!o) return; const s = await getSettings();
  const admins = (await repo.listUsers()).filter((u) => u.role === 'admin' && u.active); for (const a of admins) await x3.insertNotification({ id: uid('nt'), userId: a.id, kind: 'ads', text: `💶 Nuovo ordine pubblicitario pagato (${o.amount.toFixed(2)} €) da ${o.company || o.email}: approvalo in Pubblicità`, url: '/admin/pubblicita', read: false, createdAt: new Date().toISOString() }).catch(() => {});
  const { mailConfigured, mailLayout, sendMail } = await import('./mailer'); if (await mailConfigured()) await sendMail({ to: o.email, subject: `Ordine ricevuto · ${s.siteName}`, html: mailLayout(s.siteName, 'Grazie per l\'ordine', `<p>Abbiamo ricevuto il pagamento di ${o.amount.toFixed(2)} €. La redazione verifica il banner e lo mette online nel periodo scelto: ti avvisiamo alla partenza.</p>`) }).catch(() => {});
}

export async function completeTeamOrder(m: { team_seats: string; team_months: string; team_email: string; team_company?: string }): Promise<void> {
  const seats = Math.min(500, Number(m.team_seats) || 0); const months = Number(m.team_months) || 1; if (!seats) return; const { randomToken } = await import('./security'); const codes: string[] = [];
  for (let i = 0; i < seats; i++) { const code = 'TEAM-' + randomToken(5).toUpperCase().slice(0, 8); codes.push(code); await x3.insertGift({ id: uid('gf'), code, email: m.team_email, months, message: m.team_company ?? '', fromReader: '', redeemedBy: '', createdAt: new Date().toISOString(), redeemedAt: null }); }
  const s = await getSettings(); const { mailConfigured, mailLayout, sendMail } = await import('./mailer');
  if (await mailConfigured()) await sendMail({ to: m.team_email, subject: `I ${seats} accessi di ${s.siteName} per ${m.team_company || 'la tua azienda'}`, html: mailLayout(s.siteName, 'Abbonamento aziendale attivo', `<p>Ecco i ${seats} codici (validi ${months} ${months === 1 ? 'mese' : 'mesi'} ciascuno). Ogni collega si registra su <a href="${siteUrl()}/account">${siteUrl()}/account</a> e inserisce il proprio codice.</p><pre style="font-size:15px;line-height:1.8">${codes.join('\n')}</pre><p>La fattura arriva da Stripe a questo indirizzo.</p>`) }).catch(() => {});
}
