import 'server-only';
import * as repo from './repo';
import * as x from './repo-extra';
import { Article, Subscriber } from './models';
import { articleUrlWith, getCategories, getSettings, listPublished } from './queries';
import { button, esc, mailConfigured, mailLayout, mailSettings, sendMail } from './mailer';
import { signedToken } from './auth';
import { siteUrl } from './site-url';
import { randomToken } from './security';
import { uid } from './utils';

const confirmUrl = (token: string) => `${siteUrl()}/newsletter/conferma?t=${token}`;
const unsubUrl = async (s: Subscriber) => `${siteUrl()}/newsletter/disiscrivi?t=${await signedToken(s.id)}`;

/** Iscrizione con doppio opt-in: se l'email è configurata invia il messaggio di conferma, altrimenti conferma subito. */
export async function subscribe(email: string, source = 'sito'): Promise<{ ok: boolean; message: string }> {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, message: 'Inserisci un indirizzo email valido.' };
  const cfg = await mailSettings();
  const existing = await repo.findSubscriberByEmail(e);
  if (existing?.status === 'confirmed') return { ok: true, message: 'Sei già iscritto alla newsletter.' };
  const doubleOptIn = cfg.doubleOptIn && (await mailConfigured());
  const token = randomToken(24);
  const s: Subscriber = { id: existing?.id ?? uid('s'), email: e, createdAt: existing?.createdAt ?? new Date().toISOString(), status: doubleOptIn ? 'pending' : 'confirmed', token, confirmedAt: doubleOptIn ? null : new Date().toISOString(), source };
  await repo.insertSubscriber(s);
  try { const { ensureDefaultList } = await import('./newsletters'); const { subscribeToList } = await import('./repo-extra2'); const def = await ensureDefaultList(); const saved = await repo.findSubscriberByEmail(e); if (saved) await subscribeToList(saved.id, def.id); } catch { /* lista predefinita non disponibile */ }
  if (!doubleOptIn) return { ok: true, message: 'Iscrizione completata. Benvenuto!' };
  const site = await getSettings();
  const r = await sendMail({ to: e, subject: `Conferma l'iscrizione a ${site.siteName}`, html: mailLayout(site.siteName, 'Conferma la tua iscrizione', `<p>Grazie per esserti iscritto alla newsletter di <b>${esc(site.siteName)}</b>. Conferma il tuo indirizzo per ricevere ogni mattina le notizie del giorno.</p>${button(confirmUrl(token), 'Confermo l\'iscrizione')}<p style="color:#71717a;font-size:13px">Se non hai richiesto tu l'iscrizione ignora questa email: non riceverai nulla.</p>`), text: `Conferma l'iscrizione: ${confirmUrl(token)}` });
  return r.ok ? { ok: true, message: 'Quasi fatto! Controlla la posta e conferma l\'iscrizione.' } : { ok: false, message: 'Invio email non riuscito: riprova più tardi.' };
}
export async function confirm(token: string): Promise<boolean> {
  const s = await repo.findSubscriberByToken(token);
  if (!s) return false;
  await repo.setSubscriberStatus(s.id, 'confirmed');
  return true;
}
export async function unsubscribe(id: string): Promise<boolean> {
  const s = await findById(id);
  if (!s) return false;
  await repo.setSubscriberStatus(s.id, 'unsubscribed');
  return true;
}
async function findById(id: string): Promise<Subscriber | undefined> { const { get } = await import('./db'); const r = await get<Record<string, unknown>>('SELECT * FROM subscribers WHERE id = ?', [id]); return r ? { id: String(r.id), email: String(r.email), createdAt: String(r.created_at), status: r.status as Subscriber['status'] } : undefined; }

/** HTML della rassegna del mattino: le notizie delle ultime 24 ore (o le più recenti). */
export async function buildDigest(hours = 24): Promise<{ subject: string; html: (unsub: string) => string; text: string; articles: Article[] }> {
  const [site, cats] = await Promise.all([getSettings(), getCategories()]);
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  let list = (await listPublished({}, 30)).filter((a) => (a.publishedAt ?? '') >= since);
  if (list.length < 5) list = await listPublished({}, 8);
  const featured = list.find((a) => a.featured) ?? list[0];
  const rest = list.filter((a) => a.id !== featured?.id).slice(0, 9);
  const base = siteUrl();
  const day = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const subject = featured ? `${featured.title} · La rassegna di ${site.siteName}` : `Le notizie di oggi · ${site.siteName}`;
  const card = (a: Article, big = false) => `<a href="${base}${articleUrlWith(a, cats)}?utm_source=newsletter&utm_medium=email" style="display:block;text-decoration:none;color:#1a1a1a;margin-bottom:${big ? 24 : 16}px;border-bottom:1px solid #eee;padding-bottom:${big ? 20 : 14}px">${a.coverImage && big ? `<img src="${esc(a.coverImage)}" alt="" style="width:100%;height:auto;border-radius:6px;margin-bottom:12px" />` : ''}<span style="display:block;color:#d7262d;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${esc(a.kicker || cats.find((c) => c.id === a.categoryId)?.name || '')}</span><span style="display:block;font-size:${big ? 22 : 17}px;font-weight:800;line-height:1.25;margin:4px 0 6px">${esc(a.title)}</span><span style="display:block;color:#52525b;font-size:14px;line-height:1.45">${esc(a.excerpt || a.subtitle)}</span></a>`;
  const html = (unsub: string) => mailLayout(site.siteName, `Buongiorno, è ${day}`, `<p style="color:#52525b;margin-top:-6px">Le notizie da sapere in cinque minuti, scelte dalla redazione.</p>${featured ? card(featured, true) : ''}${rest.map((a) => card(a)).join('')}${button(base, `Tutte le notizie su ${site.siteName}`)}`, `Ricevi questa email perché sei iscritto alla newsletter di ${esc(site.siteName)}. <a href="${unsub}" style="color:#71717a">Disiscriviti</a> · ${esc(site.footerText ?? '')}`);
  const text = [subject, '', ...list.map((a) => `• ${a.title}\n  ${base}${articleUrlWith(a, cats)}`)].join('\n');
  return { subject, html, text, articles: list };
}

/** Invia la rassegna a tutti gli iscritti confermati (a blocchi, con link di disiscrizione personale). */
export async function sendDigest(kind: 'digest' | 'manual' = 'digest', subjectOverride?: string): Promise<{ ok: boolean; sent: number; message: string }> {
  if (!(await mailConfigured())) return { ok: false, sent: 0, message: 'Servizio email non configurato.' };
  const d = await buildDigest();
  if (!d.articles.length) return { ok: false, sent: 0, message: 'Nessun articolo da inviare.' };
  const subs = await repo.listSubscribers('confirmed', 20000);
  let sent = 0; const errors: string[] = [];
  for (const s of subs) {
    const r = await sendMail({ to: s.email, subject: subjectOverride || d.subject, html: d.html(await unsubUrl(s)), text: d.text, listUnsubscribe: await unsubUrl(s) });
    if (r.ok) sent++; else errors.push(r.error ?? 'errore');
    if (errors.length > 20 && sent === 0) break;
  }
  await x.insertNewsletterSend({ id: uid('nl'), subject: subjectOverride || d.subject, kind, recipients: sent, sentAt: new Date().toISOString(), status: sent ? 'sent' : 'failed', message: errors[0] ?? '' });
  return { ok: sent > 0, sent, message: sent ? `Inviata a ${sent} iscritti.` : `Invio fallito: ${errors[0] ?? 'nessun destinatario'}` };
}
export async function sendTestDigest(to: string): Promise<{ ok: boolean; message: string }> {
  const d = await buildDigest();
  const r = await sendMail({ to, subject: `[PROVA] ${d.subject}`, html: d.html('#'), text: d.text });
  return r.ok ? { ok: true, message: `Email di prova inviata a ${to}.` } : { ok: false, message: r.error ?? 'Errore' };
}
