import 'server-only';
import * as repo from './repo';
import * as x from './repo-extra';
import * as x2 from './repo-extra2';
import { Article, Newsletter, NewsletterBlock, Subscriber } from './models';
import { articleUrlWith, getCategories, getEvents, getSettings, listPublished } from './queries';
import { button, esc, mailConfigured, mailLayout, sendMail } from './mailer';
import { signedToken } from './auth';
import { siteUrl } from './site-url';
import { getWeather, weatherLabel } from './weather';
import { uid } from './utils';

/** Blocchi predefiniti della rassegna del mattino. */
export const DEFAULT_BLOCKS: NewsletterBlock[] = [
  { id: 'b1', type: 'header', title: 'Buongiorno, ecco le notizie di oggi', text: 'Le notizie da sapere in cinque minuti, scelte dalla redazione.' },
  { id: 'b2', type: 'articles', title: 'In apertura', filter: { featured: true, limit: 1, hours: 48 }, layout: 'cards' },
  { id: 'b3', type: 'articles', title: 'Le altre notizie', filter: { limit: 8, hours: 24 }, layout: 'list' },
  { id: 'b4', type: 'events', title: 'Cosa fare oggi' },
  { id: 'b5', type: 'button', title: 'Tutte le notizie', url: '/' },
];
/** Garantisce che esista almeno la lista predefinita e iscrive a essa chi non ha liste. */
export async function ensureDefaultList(): Promise<Newsletter> {
  const lists = await x2.listNewsletters();
  let def = lists.find((l) => l.isDefault) ?? lists[0];
  if (!def) { def = { id: uid('nl'), slug: 'rassegna-del-mattino', name: 'Rassegna del mattino', description: 'Le notizie del giorno, ogni mattina.', kind: 'digest', config: { hours: 24 }, blocks: DEFAULT_BLOCKS, schedule: { hour: 7, days: [1, 2, 3, 4, 5, 6, 0], enabled: false }, enabled: true, isDefault: true, createdAt: new Date().toISOString() }; await x2.upsertNewsletter(def); }
  const { run } = await import('./db');
  await run("INSERT INTO subscriber_lists (subscriber_id, list_id, created_at) SELECT s.id, ?, ? FROM subscribers s WHERE NOT EXISTS (SELECT 1 FROM subscriber_lists sl WHERE sl.subscriber_id = s.id) ON CONFLICT DO NOTHING", [def.id, new Date().toISOString()]);
  return def;
}
const unsubUrl = async (s: Subscriber) => `${siteUrl()}/newsletter/disiscrivi?t=${await signedToken(s.id)}`;
const track = (sendId: string, subId: string) => ({ pixel: `${siteUrl()}/api/nl/o?s=${sendId}&r=${subId}`, link: (u: string) => `${siteUrl()}/api/nl/c?s=${sendId}&r=${subId}&u=${encodeURIComponent(u)}` });

async function articlesFor(list: Newsletter, f: NonNullable<NewsletterBlock['filter']>, used: Set<string>): Promise<Article[]> {
  const since = new Date(Date.now() - (f.hours ?? list.config.hours ?? 24) * 3600_000).toISOString();
  const base = { categoryId: f.categoryId ?? list.config.categoryId, zoneId: f.zoneId ?? list.config.zoneId, tagId: f.tagId ?? list.config.tagId, ...(f.featured ? { featured: true } : {}) };
  let list1 = (await listPublished(base, (f.limit ?? 6) * 3)).filter((a) => (a.publishedAt ?? '') >= since && !used.has(a.id));
  if (list1.length < Math.min(3, f.limit ?? 6)) list1 = (await listPublished(base, (f.limit ?? 6) * 2)).filter((a) => !used.has(a.id));
  const out = list1.slice(0, f.limit ?? 6); out.forEach((a) => used.add(a.id));
  return out;
}
/** Costruisce l'email di una lista dai suoi blocchi. Ritorna una funzione che personalizza per iscritto (tracciamento e disiscrizione). */
export async function buildNewsletter(list: Newsletter): Promise<{ subject: string; articles: Article[]; render: (sub: Subscriber, sendId: string) => Promise<string>; text: string }> {
  const [site, cats] = await Promise.all([getSettings(), getCategories()]);
  const base = siteUrl(); const used = new Set<string>(); const all: Article[] = [];
  const parts: { html: (t: ReturnType<typeof track>) => string }[] = [];
  let subject = list.config.subject || list.name;
  for (const b of list.blocks) {
    if (b.type === 'header') parts.push({ html: () => `<h2 style="font-size:20px;margin:0 0 6px">${esc(b.title ?? '')}</h2>${b.text ? `<p style="color:#52525b;margin:0 0 18px">${esc(b.text)}</p>` : ''}` });
    else if (b.type === 'text') parts.push({ html: () => `<div style="font-size:15px;line-height:1.55;margin:0 0 16px">${b.text ?? ''}</div>` });
    else if (b.type === 'image') parts.push({ html: (t) => (b.image ? `<p style="margin:0 0 16px">${b.url ? `<a href="${t.link(b.url)}">` : ''}<img src="${esc(b.image)}" alt="" style="width:100%;height:auto;border-radius:6px" />${b.url ? '</a>' : ''}</p>` : '') });
    else if (b.type === 'button') parts.push({ html: (t) => `<p style="margin:20px 0"><a href="${t.link(b.url?.startsWith('http') ? b.url : base + (b.url || '/'))}" style="display:inline-block;background:#d7262d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:700">${esc(b.title ?? 'Leggi')}</a></p>` });
    else if (b.type === 'divider') parts.push({ html: () => '<hr style="border:0;border-top:1px solid #e4e4e7;margin:20px 0" />' });
    else if (b.type === 'weather') { const w = await getWeather(site.weatherCity, site.weatherLat, site.weatherLon).catch(() => null); if (w) parts.push({ html: () => `<p style="background:#f4f4f5;padding:10px 12px;border-radius:6px;font-size:14px;margin:0 0 16px">🌤 <b>${esc(w.city)}</b>: ${esc(weatherLabel(w.current.code))}, ${Math.round(w.current.temp)}°</p>` }); }
    else if (b.type === 'events') { const ev = (await getEvents({}, 4)).slice(0, 4); if (ev.length) parts.push({ html: (t) => `<h3 style="font-size:16px;margin:16px 0 8px">${esc(b.title ?? 'Cosa fare in città')}</h3>${ev.map((e) => `<p style="margin:0 0 6px;font-size:14px">📅 <a href="${t.link(`${base}/eventi/${e.slug}`)}" style="color:#1a1a1a;font-weight:700">${esc(e.title)}</a> <span style="color:#71717a">· ${esc(e.place)}</span></p>`).join('')}` }); }
    else if (b.type === 'articles') {
      const arts = await articlesFor(list, b.filter ?? {}, used); all.push(...arts);
      if (arts.length && b.filter?.featured && !list.config.subject) subject = `${arts[0].title} · ${list.name}`;
      const big = b.layout === 'cards';
      parts.push({ html: (t) => (arts.length ? `${b.title ? `<h3 style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#d7262d;margin:18px 0 8px">${esc(b.title)}</h3>` : ''}${arts.map((a) => `<a href="${t.link(`${base}${articleUrlWith(a, cats)}?utm_source=newsletter&utm_medium=email&utm_campaign=${list.slug}`)}" style="display:block;text-decoration:none;color:#1a1a1a;margin-bottom:${big ? 22 : 14}px;border-bottom:1px solid #eee;padding-bottom:${big ? 18 : 12}px">${a.coverImage && big ? `<img src="${esc(a.coverImage)}" alt="" style="width:100%;height:auto;border-radius:6px;margin-bottom:10px" />` : ''}<span style="display:block;color:#d7262d;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${esc(a.kicker || cats.find((c) => c.id === a.categoryId)?.name || '')}</span><span style="display:block;font-size:${big ? 22 : 17}px;font-weight:800;line-height:1.25;margin:4px 0 6px">${esc(a.title)}</span><span style="display:block;color:#52525b;font-size:14px;line-height:1.45">${esc(a.excerpt || a.subtitle)}</span></a>`).join('')}` : '') });
    }
  }
  const text = [subject, '', ...all.map((a) => `• ${a.title}\n  ${base}${articleUrlWith(a, cats)}`)].join('\n');
  const render = async (sub: Subscriber, sendId: string) => { const t = track(sendId, sub.id); return mailLayout(site.siteName, list.name, parts.map((p) => p.html(t)).join(''), `Ricevi «${esc(list.name)}» perché sei iscritto alla newsletter di ${esc(site.siteName)}. <a href="${await unsubUrl(sub)}" style="color:#71717a">Disiscriviti</a> · ${esc(site.footerText ?? '')}<img src="${t.pixel}" width="1" height="1" alt="" style="display:block" />`); };
  return { subject, articles: all, render, text };
}
/** Invia una lista a tutti i suoi iscritti confermati, con tracciamento di aperture e clic. */
export async function sendList(list: Newsletter, kind: 'digest' | 'manual' = 'digest', subjectOverride?: string): Promise<{ ok: boolean; sent: number; message: string }> {
  if (!(await mailConfigured())) return { ok: false, sent: 0, message: 'Servizio email non configurato.' };
  const built = await buildNewsletter(list);
  if (!built.articles.length && !list.blocks.some((b) => b.type === 'text')) return { ok: false, sent: 0, message: 'Nessun contenuto da inviare per questa lista.' };
  const subs = await x2.subscribersOfList(list.id);
  const sendId = uid('nl'); let sent = 0; const errors: string[] = [];
  for (const s of subs) {
    const r = await sendMail({ to: s.email, subject: subjectOverride || built.subject, html: await built.render(s, sendId), text: built.text, listUnsubscribe: await unsubUrl(s) });
    if (r.ok) sent++; else errors.push(r.error ?? 'errore');
    if (errors.length > 20 && sent === 0) break;
  }
  await x.insertNewsletterSend({ id: sendId, subject: subjectOverride || built.subject, kind, recipients: sent, sentAt: new Date().toISOString(), status: sent ? 'sent' : 'failed', message: errors[0] ?? '', listId: list.id });
  const { run } = await import('./db'); await run('UPDATE newsletter_sends SET list_id = ? WHERE id = ?', [list.id, sendId]);
  return { ok: sent > 0, sent, message: sent ? `«${list.name}» inviata a ${sent} iscritti.` : `Invio fallito: ${errors[0] ?? 'nessun iscritto confermato'}` };
}
export async function sendListTest(list: Newsletter, to: string): Promise<{ ok: boolean; message: string }> {
  const built = await buildNewsletter(list);
  const r = await sendMail({ to, subject: `[PROVA] ${built.subject}`, html: await built.render({ id: 'test', email: to, createdAt: '' }, 'test'), text: built.text });
  return r.ok ? { ok: true, message: `Prova inviata a ${to}.` } : { ok: false, message: r.error ?? 'Errore' };
}
/** Liste da inviare adesso secondo la loro pianificazione (ora Italia, giorno della settimana, non già inviate oggi). */
export async function dueLists(): Promise<Newsletter[]> {
  const now = new Date(); const hour = Number(now.toLocaleString('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' })); const day = now.getDay(); const today = now.toISOString().slice(0, 10);
  const out: Newsletter[] = [];
  for (const l of await x2.listNewsletters()) {
    if (!l.enabled || !l.schedule.enabled || hour < l.schedule.hour || !l.schedule.days.includes(day)) continue;
    const last = await repo.getSettingsRow().then(() => x.listNewsletterSends(50)).then((s) => s.find((x) => x.listId === l.id && x.status === 'sent'));
    if (last && last.sentAt.slice(0, 10) === today) continue;
    out.push(l);
  }
  return out;
}
