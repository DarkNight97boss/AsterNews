import 'server-only';
import { DEFAULT_NEWSLETTER, NewsletterSettings } from './models';
import { getSettings } from './queries';

export interface Mail { to: string | string[]; subject: string; html: string; text?: string; replyTo?: string; listUnsubscribe?: string }

/** Impostazioni email: dal pannello, con le variabili d'ambiente come ripiego (RESEND_API_KEY, BREVO_API_KEY, MAIL_FROM). */
export async function mailSettings(): Promise<NewsletterSettings> {
  const s = { ...DEFAULT_NEWSLETTER, ...((await getSettings()).newsletter ?? {}) };
  if (s.provider === 'none' && process.env.RESEND_API_KEY) { s.provider = 'resend'; s.apiKey = process.env.RESEND_API_KEY; }
  if (s.provider === 'none' && process.env.BREVO_API_KEY) { s.provider = 'brevo'; s.apiKey = process.env.BREVO_API_KEY; }
  if (!s.apiKey) s.apiKey = (s.provider === 'resend' ? process.env.RESEND_API_KEY : process.env.BREVO_API_KEY) ?? '';
  if (!s.fromEmail) s.fromEmail = process.env.MAIL_FROM ?? '';
  return s;
}
export async function mailConfigured(): Promise<boolean> { const s = await mailSettings(); return s.provider !== 'none' && !!s.apiKey && !!s.fromEmail; }

/** Invia una email con il provider configurato (Resend o Brevo, via REST, nessun SDK). Ritorna false se non configurato. */
export async function sendMail(m: Mail, override?: NewsletterSettings): Promise<{ ok: boolean; error?: string }> {
  const s = override ?? await mailSettings();
  if (s.provider === 'none' || !s.apiKey || !s.fromEmail) return { ok: false, error: 'Servizio email non configurato (Impostazioni → Newsletter ed email).' };
  const to = Array.isArray(m.to) ? m.to : [m.to];
  const from = s.fromName ? `${s.fromName} <${s.fromEmail}>` : s.fromEmail;
  try {
    if (s.provider === 'resend') {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo, headers: m.listUnsubscribe ? { 'List-Unsubscribe': `<${m.listUnsubscribe}>` } : undefined }) });
      if (!r.ok) return { ok: false, error: `Resend: ${r.status} ${(await r.text()).slice(0, 200)}` };
      return { ok: true };
    }
    const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': s.apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: { email: s.fromEmail, name: s.fromName || undefined }, to: to.map((email) => ({ email })), subject: m.subject, htmlContent: m.html, textContent: m.text, replyTo: m.replyTo ? { email: m.replyTo } : undefined, headers: m.listUnsubscribe ? { 'List-Unsubscribe': `<${m.listUnsubscribe}>` } : undefined }) });
    if (!r.ok) return { ok: false, error: `Brevo: ${r.status} ${(await r.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Layout email essenziale, leggibile in tutti i client. */
export function mailLayout(siteName: string, title: string, bodyHtml: string, footerHtml = ''): string {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
<div style="max-width:620px;margin:0 auto;padding:24px 16px">
<div style="background:#22418f;color:#fff;padding:16px 20px;font-weight:800;font-size:20px;letter-spacing:.02em">${esc(siteName)}</div>
<div style="background:#fff;padding:24px 20px;border:1px solid #e4e4e7;border-top:0">
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
</div>
<div style="color:#71717a;font-size:12px;padding:16px 4px;line-height:1.5">${footerHtml}</div>
</div></body></html>`;
}
export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
export const button = (href: string, label: string): string => `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#d7262d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:700">${esc(label)}</a></p>`;
