import 'server-only';
import { metaGet, metaSet } from './db';
import * as x from './repo-extra';
import { getSettings } from './queries';
import { DEFAULT_PUSH } from './models';

/** Chiavi VAPID: da ambiente (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY) oppure generate una volta e salvate nel database. */
export async function vapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  const pub = await metaGet('vapid_public'); const priv = await metaGet('vapid_private');
  if (pub && priv) return { publicKey: pub, privateKey: priv };
  const webpush = (await import('web-push')).default;
  const k = webpush.generateVAPIDKeys();
  await metaSet('vapid_public', k.publicKey); await metaSet('vapid_private', k.privateKey);
  return k;
}
export async function pushEnabled(): Promise<boolean> { return { ...DEFAULT_PUSH, ...((await getSettings()).push ?? {}) }.enabled; }

export interface PushMessage { title: string; body: string; url: string; icon?: string; image?: string; tag?: string }
/** Invia una notifica a tutti gli iscritti (o solo a chi segue un argomento). Le sottoscrizioni scadute vengono rimosse. */
export async function sendPush(msg: PushMessage, topic?: string): Promise<{ sent: number; failed: number }> {
  if (!(await pushEnabled())) return { sent: 0, failed: 0 };
  const webpush = (await import('web-push')).default;
  const keys = await vapidKeys();
  const s = await getSettings();
  webpush.setVapidDetails(`mailto:${s.newsletter?.fromEmail || 'redazione@example.com'}`, keys.publicKey, keys.privateKey);
  // Tetto di notifiche: ogni lettore decide quante al giorno, e il giornale non può superarlo (nemmeno per le ultim'ora)
  const { realTopics, underCap, pushCap } = await import('./distribution'); const { findRecord, bumpCounter } = await import('./records'); const { createHash } = await import('node:crypto'); const day = new Date().toISOString().slice(0, 10); const keyOf = (endpoint: string) => `${day}_${createHash('sha1').update(endpoint).digest('hex').slice(0, 20)}`;
  const all = (await x.listPushSubscriptions()).filter((sub) => !topic || realTopics(sub.topics).length === 0 || sub.topics.includes(topic)); const subs: typeof all = [];
  for (const sub of all) { if (pushCap(sub.topics) === null) { subs.push(sub); continue; } const sentToday = (await findRecord<{ n: number }>(`pushcap_${keyOf(sub.endpoint)}`))?.data.n ?? 0; if (underCap(sub.topics, sentToday)) subs.push(sub); }
  const payload = JSON.stringify({ ...msg, icon: msg.icon ?? '/icon.png' });
  let sent = 0, failed = 0;
  await Promise.all(subs.map(async (sub) => {
    try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 3600, urgency: 'high' }); sent++; if (pushCap(sub.topics) !== null) await bumpCounter('pushcap', keyOf(sub.endpoint)); }
    catch (e) { failed++; const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await x.deletePushSubscription(sub.endpoint); else await x.markPushFailure(sub.endpoint); }
  }));
  return { sent, failed };
}
