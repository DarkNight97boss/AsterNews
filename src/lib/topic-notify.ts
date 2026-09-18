import 'server-only';
import * as repo from './repo';
import * as x from './repo-extra';
import * as x3 from './repo-extra3';
import type { Article } from './models';
import { getSettings } from './queries';
import { siteUrl } from './site-url';

/** Alla pubblicazione: push a chi ha scelto quella zona o categoria, email a chi segue i tag dell'articolo. */
export async function notifyTopics(a: Article): Promise<{ push: number; mail: number }> {
  const s = await getSettings(); const cats = await repo.listCategories(); const cat = cats.find((c) => c.id === a.categoryId); const url = `/${cat?.slug ?? 'notizie'}/${a.slug}`; let push = 0, mail = 0;
  try {
    const { pushEnabled, vapidKeys } = await import('./push');
    if ((await pushEnabled()) && !a.breaking) { // le ultim'ora vanno già a tutti
      const topics = [`cat:${a.categoryId}`, ...(a.zoneId ? [`zone:${a.zoneId}`] : [])]; const subs = (await x.listPushSubscriptions()).filter((sub) => sub.topics.some((t) => topics.includes(t)));
      if (subs.length) { const webpush = (await import('web-push')).default; const keys = await vapidKeys(); webpush.setVapidDetails(`mailto:${s.newsletter?.fromEmail || 'redazione@example.com'}`, keys.publicKey, keys.privateKey); const payload = JSON.stringify({ title: cat?.name ?? s.siteName, body: a.title, url, image: a.coverImage || undefined, tag: a.id, icon: '/icon.png' });
        await Promise.all(subs.map(async (sub) => { try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 7200 }); push++; } catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await x.deletePushSubscription(sub.endpoint); } })); }
    }
  } catch { /* le notifiche non devono bloccare la pubblicazione */ }
  try {
    const { mailConfigured, mailLayout, sendMail } = await import('./mailer');
    if (a.tagIds.length && (await mailConfigured())) { const follows = await x3.followersOfTags(a.tagIds, 300); const tags = await repo.listTags(5000); const seen = new Set<string>();
      for (const f of follows) { if (seen.has(f.email)) continue; seen.add(f.email); const t = tags.find((k) => k.id === f.tagId); const r = await sendMail({ to: f.email, subject: `${t?.name ?? 'Argomento'}: ${a.title}`, html: mailLayout(s.siteName, `Nuovo su «${t?.name ?? ''}»`, `<h2 style="font-family:Georgia,serif">${a.title}</h2><p>${a.excerpt}</p><p><a href="${siteUrl()}${url}">Leggi l'articolo</a></p><p style="font-size:12px;color:#777">Ricevi questa email perché segui l'argomento. <a href="${siteUrl()}/api/follow/unsubscribe?t=${f.token}">Smetti di seguirlo</a>.</p>`) }); if (r.ok) mail++; } }
  } catch { /* idem */ }
  return { push, mail };
}
