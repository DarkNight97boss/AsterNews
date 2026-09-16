import 'server-only';
import { createHmac } from 'node:crypto';
import { getSettings } from './queries';
import { siteUrl } from './site-url';

/** Webhook in uscita per Zapier/Make/n8n: firma HMAC-SHA256 nell'intestazione X-Aster-Signature, tentativi con attesa crescente. */
export type WebhookEvent = 'article.published' | 'article.updated' | 'comment.created' | 'subscriber.created' | 'reader.registered' | 'donation.paid' | 'event.created';
export const WEBHOOK_EVENTS: { id: WebhookEvent; label: string }[] = [{ id: 'article.published', label: 'Articolo pubblicato' }, { id: 'article.updated', label: 'Articolo aggiornato' }, { id: 'comment.created', label: 'Nuovo commento' }, { id: 'subscriber.created', label: 'Nuovo iscritto newsletter' }, { id: 'reader.registered', label: 'Nuovo lettore registrato' }, { id: 'donation.paid', label: 'Donazione ricevuta' }, { id: 'event.created', label: 'Evento proposto' }];
export async function dispatchWebhook(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  const s = await getSettings(); const hooks = (s.webhooks ?? []).filter((h) => h.enabled && h.url && h.events.includes(event)); if (!hooks.length) return;
  const body = JSON.stringify({ event, site: siteUrl(), at: new Date().toISOString(), data: payload });
  await Promise.all(hooks.map(async (h) => {
    const sig = h.secret ? createHmac('sha256', h.secret).update(body).digest('hex') : '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try { const r = await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Aster-Event': event, ...(sig ? { 'X-Aster-Signature': `sha256=${sig}` } : {}) }, body, signal: AbortSignal.timeout(10_000) }); if (r.ok || r.status < 500) return; } catch { /* riprova */ }
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }));
}
