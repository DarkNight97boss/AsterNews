import 'server-only';
import { checkAccessibility } from './a11y-check';
import { CARD_KINDS } from './civic';
import { COMMUNITY } from './community';
import { NAV } from './admin-nav';
import { buildManual, byteReport } from './platform';
import { articleUrlWith, getCategories, getSettings } from './queries';
import { addRecord, findRecord, listRecords } from './records';
import * as repo from './repo';
import { siteUrl } from './site-url';
import { publicContent } from './content-render';

/** Pagine che l'audit visita: home, due sezioni, le ultime cinque storie, le pagine di servizio leggere. */
async function auditPaths(): Promise<string[]> { const [cats, arts] = await Promise.all([getCategories(), repo.listArticles({ status: 'published' }, 'published', 5)]); return ['/', ...cats.filter((c) => c.showInMenu).slice(0, 2).map((c) => `/${c.slug}`), ...arts.map((a) => articleUrlWith(a, cats)), '/emergenza', '/cerca']; }
/** Budget di byte (ogni notte) e accessibilità (il primo del mese): il sito visita sé stesso e misura. */
export async function platformAudit(force = false): Promise<string> {
  const s = await getSettings(); const budget = s.platform?.byteBudgetKb ?? 0; const monthly = new Date().getDate() === 1 || force; if (!budget && !monthly) return '';
  const base = siteUrl(); if (!/^https?:\/\//.test(base) || /localhost|127\.0\.0\.1/.test(base)) return 'indirizzo del sito non pubblico';
  const paths = await auditPaths(); const pages: { path: string; bytes: number; html: string }[] = [];
  for (const path of paths) { try { const r = await fetch(`${base}${path}`, { headers: { 'User-Agent': 'AsterAudit/1.0' }, cache: 'no-store' }); const html = await r.text(); pages.push({ path, bytes: Buffer.byteLength(html), html }); } catch { /* pagina non raggiungibile */ } }
  const out: string[] = [];
  if (budget) { const rep = byteReport(pages, budget); await addRecord('byte-audit', { id: `ba_${new Date().toISOString().slice(0, 10)}`, status: 'done', data: { budgetKb: budget, pages: pages.map((p) => ({ path: p.path, bytes: p.bytes })), over: rep.over, total: rep.total } }); out.push(rep.over.length ? `${rep.over.length} pagine oltre ${budget} kB` : `byte ok (${pages.length} pagine)`); }
  if (monthly) { const month = new Date().toISOString().slice(0, 7); if (force || !(await findRecord(`aa_${month}`))) { const results = pages.map((p) => { const issues = checkAccessibility(p.html, p.path); return { path: p.path, errors: issues.filter((i) => i.level === 'error').length, warns: issues.filter((i) => i.level === 'warn').length, issues: issues.slice(0, 12).map((i) => i.text) }; }); const errors = results.reduce((n, r) => n + r.errors, 0), warns = results.reduce((n, r) => n + r.warns, 0); await addRecord('a11y-audit', { id: `aa_${month}`, status: 'done', data: { month, pages: results, errors, warns, score: Math.max(0, 100 - errors * 10 - warns * 2) } }); out.push(`accessibilità ${month}: ${errors} errori, ${warns} avvisi`); } }
  return out.join(' · ');
}
export const lastByteAudit = async () => (await listRecords<{ budgetKb: number; pages: { path: string; bytes: number }[]; over: { path: string; bytes: number; pct: number }[]; total: number }>('byte-audit', { limit: 1 }))[0];
export const a11yAudits = async (limit = 12) => (await listRecords<{ month: string; pages: { path: string; errors: number; warns: number; issues: string[] }[]; errors: number; warns: number; score: number }>('a11y-audit', { limit })).map((r) => r.data);
/** Gli articoli che il giornale offre alla rete (quelli marcati «condivisibile»), con il testo. */
export async function networkFeed(): Promise<{ site: string; url: string; articles: { id: string; title: string; subtitle: string; url: string; publishedAt: string | null; category: string; share: boolean; license?: string; content?: string; author?: string }[] }> {
  const [s, cats, arts, users] = await Promise.all([getSettings(), getCategories(), repo.listArticles({ status: 'published' }, 'published', 30), repo.listUsers()]); const base = siteUrl();
  const articles = []; for (const a of arts) { const share = !!a.extra?.share?.allowed; articles.push({ id: a.id, title: a.title, subtitle: a.subtitle, url: `${base}${articleUrlWith(a, cats)}`, publishedAt: a.publishedAt, category: cats.find((c) => c.id === a.categoryId)?.name ?? '', share, license: share ? a.extra?.share?.license || 'CC BY 4.0' : undefined, content: share ? await publicContent(a.content) : undefined, author: a.byline || users.find((u) => u.id === a.authorId)?.name }); }
  return { site: s.siteName, url: base, articles };
}
export async function peerFeeds(): Promise<{ name: string; url: string; ok: boolean; articles: Awaited<ReturnType<typeof networkFeed>>['articles'] }[]> { const peers = (await getSettings()).network?.peers ?? []; return Promise.all(peers.map(async (p) => { try { const r = await fetch(`${p.url.replace(/\/$/, '')}/api/rete`, { next: { revalidate: 600 }, headers: { 'User-Agent': 'AsterNetwork/1.0' } }); const j = (await r.json()) as Awaited<ReturnType<typeof networkFeed>>; return { name: p.name, url: p.url, ok: Array.isArray(j.articles), articles: Array.isArray(j.articles) ? j.articles.slice(0, 10) : [] }; } catch { return { name: p.name, url: p.url, ok: false, articles: [] }; } })); }
export async function manualMarkdown(): Promise<string> { const s = await getSettings(); const { FOOTER_PAGES } = await import('../components/site/footer-pages'); return buildManual({ siteName: s.siteName, nav: NAV.map((n) => ({ href: n.href, label: n.label, group: n.group, perm: n.perm })), kinds: Object.values(COMMUNITY).map((k) => ({ kind: k.kind, title: k.title, fields: k.fields.map((f) => ({ label: f.label, required: f.required })), perHour: k.perHour })), cards: Object.entries(CARD_KINDS).map(([kind, d]) => ({ kind, name: d.name, hint: d.hint, group: d.group })), pages: FOOTER_PAGES }); }
