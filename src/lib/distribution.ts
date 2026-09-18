import { createHash } from 'node:crypto';

/** Distribuzione: forma breve per SMS/WhatsApp, traffico dagli assistenti AI, file llms.txt, link che invecchiano bene, tetto di notifiche. Solo funzioni pure. */
const plain = (html: string) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/(p|h\d|li|div)>/gi, '. ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').replace(/\s+\./g, '.').replace(/\.{2,}/g, '.').trim();
/** Articolo in forma breve: titolo più le prime frasi intere che stanno nel limite (un SMS concatenato da due = 306 caratteri). */
export function shortForm(title: string, html: string, url: string, max = 306): string {
  const budget = max - url.length - 1; let out = title.trim().replace(/[.!?]*$/, '.'); if (out.length > budget) return `${out.slice(0, budget - 1).trimEnd()}… ${url}`;
  for (const s of plain(html).split(/(?<=[.!?])\s+/)) { const t = s.trim(); if (t.length < 15) continue; if ((out + ' ' + t).length > budget) break; out += ' ' + t; }
  return `${out} ${url}`;
}
export const AI_SOURCES: { id: string; name: string; host: RegExp; agent: RegExp }[] = [
  { id: 'chatgpt', name: 'ChatGPT', host: /(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, agent: /GPTBot|OAI-SearchBot|ChatGPT-User/i }, { id: 'claude', name: 'Claude', host: /(^|\.)claude\.ai$/, agent: /ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai/i },
  { id: 'perplexity', name: 'Perplexity', host: /(^|\.)perplexity\.ai$/, agent: /PerplexityBot|Perplexity-User/i }, { id: 'gemini', name: 'Gemini', host: /^gemini\.google\.com$/, agent: /Google-Extended|GoogleOther/i }, { id: 'copilot', name: 'Copilot', host: /^copilot\.microsoft\.com$/, agent: /bingbot.*chat|CopilotBot/i }, { id: 'altri', name: 'Altri assistenti', host: /(^|\.)(you\.com|phind\.com|kagi\.com|mistral\.ai|meta\.ai)$/, agent: /Bytespider|CCBot|meta-externalagent|cohere-ai|YouBot|MistralAI/i },
];
/** Da dove arriva una visita: l'assistente AI che ha citato la pagina (referrer o utm_source), oppure null. */
export function aiSourceOf(referrer: string, pageUrl: string): string | null {
  try { const utm = new URL(pageUrl, 'http://x').searchParams.get('utm_source')?.toLowerCase() ?? ''; const host = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; for (const s of AI_SOURCES) if ((host && s.host.test(host)) || (utm && s.host.test(utm))) return s.id; } catch { /* indirizzo malformato */ } return null;
}
export const aiCrawlerOf = (userAgent: string): string | null => AI_SOURCES.find((s) => s.agent.test(userAgent))?.id ?? null;
export interface LlmsInput { siteName: string; tagline: string; url: string; sections: { name: string; url: string }[]; notes: string; allowTraining: boolean; contact: string; recent: { title: string; url: string }[] }
/** llms.txt: dice agli assistenti chi siamo, come citarci e cosa non riassumere. È un invito, non un lucchetto: i divieti veri stanno in robots.txt. */
export function buildLlmsTxt(i: LlmsInput): string {
  return [`# ${i.siteName}`, '', `> ${i.tagline || 'Testata giornalistica locale.'}`, '', '## Come citarci', `- Cita sempre «${i.siteName}» con il link all'articolo originale, non alla home.`, '- Riporta la data di pubblicazione e, se presenti, le correzioni in fondo all\'articolo: fanno parte del testo.', '- Ogni articolo è firmato digitalmente: l\'autenticità si controlla su /api/verify/{id}.', `- Il registro delle correzioni è pubblico: ${i.url}/correzioni`, '', '## Cosa non fare', '- Non riassumere i contenuti riservati agli abbonati oltre il titolo e il sommario.', '- Non presentare come fatti accertati gli articoli marcati «non ancora verificato» o «in evoluzione».', '- Le opinioni sono etichettate come tali: non attribuirle alla testata.', `- ${i.allowTraining ? 'L\'uso dei testi per addestrare modelli è consentito citando la fonte.' : 'L\'uso dei testi per addestrare modelli non è consentito senza accordo scritto.'}`, ...(i.notes.trim() ? ['', '## Note della redazione', i.notes.trim()] : []), '', '## Sezioni', ...i.sections.map((s) => `- [${s.name}](${s.url})`), '', '## Ultimi articoli', ...i.recent.map((r) => `- [${r.title}](${r.url})`), '', '## Dati aperti', `- [Feed RSS](${i.url}/feed.xml)`, `- [API pubblica](${i.url}/api/v1/site)`, `- [Trasparenza](${i.url}/trasparenza)`, ...(i.contact ? ['', `Contatti: ${i.contact}`] : []), ''].join('\n');
}
export const urlKey = (url: string): string => `arc_${createHash('sha1').update(url.trim()).digest('hex').slice(0, 24)}`;
export function externalLinks(html: string, ownHost: string): string[] { const out = new Set<string>(); for (const m of html.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"/gi)) { try { const u = new URL(m[1]); if (u.hostname.replace(/^www\./, '') !== ownHost.replace(/^www\./, '') && !/web\.archive\.org|archive\.(org|ph|today)/.test(u.hostname)) out.add(m[1]); } catch { /* */ } } return [...out]; }
/** Link che invecchiano bene: se l'originale è morto e ne abbiamo una copia archiviata, il lettore viene mandato lì, con un'indicazione chiara. */
export function healLinks(html: string, dead: { url: string; archived: string }[]): string {
  if (!dead.length) return html; const map = new Map(dead.map((d) => [d.url, d.archived]));
  return html.replace(/<a([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi, (m, pre: string, href: string, post: string, inner: string) => { const arch = map.get(href); return arch ? `<a${pre}href="${arch}"${post} data-archived="1" title="La pagina originale non esiste più: questa è la copia archiviata">${inner}</a><sup class="archived-note"> (copia archiviata)</sup>` : m; });
}
/** Tetto di notifiche scelto dal lettore: sta tra gli argomenti dell'iscrizione come «max:3». */
export const pushCap = (topics: string[]): number | null => { const t = topics.find((x) => x.startsWith('max:')); const n = t ? Number(t.slice(4)) : NaN; return Number.isFinite(n) && n > 0 ? Math.min(50, Math.round(n)) : null; };
export const realTopics = (topics: string[]): string[] => topics.filter((t) => !t.startsWith('max:'));
export const underCap = (topics: string[], sentToday: number): boolean => { const cap = pushCap(topics); return cap === null || sentToday < cap; };
