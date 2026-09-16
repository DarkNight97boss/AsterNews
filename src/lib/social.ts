import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import * as repo from './repo';
import * as x2 from './repo-extra2';
import { Article, DEFAULT_SOCIAL, SocialNetwork, SocialPost, SocialSettings } from './models';
import { articleUrlWith, getCategories, getSettings, tagsByIds } from './queries';
import { hitsByHour } from './repo-extra';
import { siteUrl } from './site-url';
import { uid } from './utils';

export async function socialSettings(): Promise<SocialSettings> { return { ...DEFAULT_SOCIAL, ...((await getSettings()).social ?? {}) }; }
export function configuredNetworks(s: SocialSettings): SocialNetwork[] {
  const out: SocialNetwork[] = [];
  if (s.facebookPageId && s.facebookToken) out.push('facebook');
  if (s.telegramBotToken && s.telegramChatId) out.push('telegram');
  if (s.xApiKey && s.xApiSecret && s.xAccessToken && s.xAccessSecret) out.push('x');
  if (s.webhookUrl) out.push('webhook');
  return out;
}
export const NETWORK_LABELS: Record<SocialNetwork, string> = { facebook: 'Facebook', telegram: 'Telegram', x: 'X', webhook: 'Webhook (Buffer/Zapier/WhatsApp)' };

/** Testo proposto per un articolo, dal template delle impostazioni ({kicker} {title} {excerpt} {url} {hashtags}). */
export async function suggestText(a: Article, network: SocialNetwork): Promise<{ text: string; url: string; image: string }> {
  const [s, cats, tags] = await Promise.all([socialSettings(), getCategories(), tagsByIds(a.tagIds)]);
  const url = `${siteUrl()}${articleUrlWith(a, cats)}?utm_source=${network}&utm_medium=social`;
  const hashtags = s.hashtagsFromTags ? tags.slice(0, 4).map((t) => '#' + t.name.replace(/[^\p{L}\p{N}]+/gu, '')).join(' ') : '';
  let text = s.template.replace('{kicker}', a.kicker || cats.find((c) => c.id === a.categoryId)?.name || '').replace('{title}', a.title).replace('{excerpt}', a.excerpt || a.subtitle).replace('{url}', url).replace('{hashtags}', hashtags);
  if (!s.template.includes('{hashtags}') && hashtags) text += `\n${hashtags}`;
  if (network === 'x' && text.length > 275) text = `${a.title.slice(0, 200)}\n${url}${hashtags ? '\n' + hashtags : ''}`.slice(0, 280);
  return { text: text.replace(/^\s*:\s*/, '').trim(), url, image: a.coverImage };
}
/** Ora migliore per pubblicare: l'ora (Italia) con più letture negli ultimi giorni, oppure subito. */
export async function bestHour(): Promise<number | null> {
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  const totals = new Array(24).fill(0);
  for (const d of days) (await hitsByHour(d)).forEach((h) => { totals[h.hour] += h.views; });
  if (!totals.some((v) => v > 20)) return null;
  const utc = totals.indexOf(Math.max(...totals));
  return (utc + (isDst() ? 2 : 1)) % 24;
}
const isDst = () => { const d = new Date(); const jan = new Date(d.getFullYear(), 0, 1).getTimezoneOffset(); return d.getTimezoneOffset() < Math.max(jan, new Date(d.getFullYear(), 6, 1).getTimezoneOffset()); };

export async function enqueue(a: Article, networks: SocialNetwork[], by: string, scheduledAt: string | null = null, textOverride?: string): Promise<SocialPost[]> {
  const out: SocialPost[] = [];
  for (const n of networks) {
    const sug = await suggestText(a, n);
    const p: SocialPost = { id: uid('sp'), articleId: a.id, network: n, status: 'queued', text: textOverride?.trim() || a.socialText || sug.text, image: sug.image, url: sug.url, scheduledAt, sentAt: null, result: '', createdBy: by, createdAt: new Date().toISOString() };
    await x2.insertSocialPost(p); out.push(p);
  }
  return out;
}
/** Invia i post in coda (chiamato dal cron e subito dopo la pubblicazione). */
export async function processQueue(limit = 20): Promise<number> {
  const due = await x2.dueSocialPosts(limit); const s = await socialSettings(); let sent = 0;
  for (const p of due) {
    try { const r = await publish(p, s); await x2.updateSocialPost(p.id, { status: 'sent', sentAt: new Date().toISOString(), result: r }); sent++; }
    catch (e) { await x2.updateSocialPost(p.id, { status: 'failed', result: (e as Error).message.slice(0, 500) }); }
  }
  return sent;
}
async function publish(p: SocialPost, s: SocialSettings): Promise<string> {
  if (p.network === 'facebook') {
    const isPhoto = !!p.image && /^https?:/.test(p.image);
    const body = isPhoto ? { url: p.image, caption: p.text, access_token: s.facebookToken } : { message: p.text, link: p.url, access_token: s.facebookToken };
    const r = await fetch(`https://graph.facebook.com/v21.0/${s.facebookPageId}/${isPhoto ? 'photos' : 'feed'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json() as { id?: string; post_id?: string; error?: { message: string } };
    if (!r.ok || d.error) throw new Error(`Facebook: ${d.error?.message ?? r.status}`);
    return `post ${d.post_id ?? d.id}`;
  }
  if (p.network === 'telegram') {
    const base = `https://api.telegram.org/bot${s.telegramBotToken}`;
    const r = p.image && /^https?:/.test(p.image)
      ? await fetch(`${base}/sendPhoto`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: s.telegramChatId, photo: p.image, caption: p.text.slice(0, 1000) }) })
      : await fetch(`${base}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: s.telegramChatId, text: p.text.slice(0, 4000), disable_web_page_preview: false }) });
    const d = await r.json() as { ok: boolean; description?: string; result?: { message_id?: number } };
    if (!d.ok) throw new Error(`Telegram: ${d.description ?? r.status}`);
    return `messaggio ${d.result?.message_id}`;
  }
  if (p.network === 'x') {
    const url = 'https://api.x.com/2/tweets';
    const oauth: Record<string, string> = { oauth_consumer_key: s.xApiKey, oauth_nonce: randomBytes(16).toString('hex'), oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: s.xAccessToken, oauth_version: '1.0' };
    const enc = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    const baseStr = ['POST', enc(url), enc(Object.keys(oauth).sort().map((k) => `${enc(k)}=${enc(oauth[k])}`).join('&'))].join('&');
    oauth.oauth_signature = createHmac('sha1', `${enc(s.xApiSecret)}&${enc(s.xAccessSecret)}`).update(baseStr).digest('base64');
    const header = 'OAuth ' + Object.keys(oauth).sort().map((k) => `${enc(k)}="${enc(oauth[k])}"`).join(', ');
    const r = await fetch(url, { method: 'POST', headers: { Authorization: header, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: p.text.slice(0, 280) }) });
    const d = await r.json() as { data?: { id: string }; detail?: string; title?: string };
    if (!r.ok) throw new Error(`X: ${d.detail ?? d.title ?? r.status}`);
    return `tweet ${d.data?.id}`;
  }
  const a = await repo.findArticle(p.articleId);
  const r = await fetch(s.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: p.text, url: p.url, image: p.image, title: a?.title, excerpt: a?.excerpt, network: 'webhook' }) });
  if (!r.ok) throw new Error(`Webhook: ${r.status}`);
  return `webhook ${r.status}`;
}
