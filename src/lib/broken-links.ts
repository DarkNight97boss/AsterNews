import 'server-only';
import { createHash } from 'node:crypto';
import * as repo from './repo';
import * as x3 from './repo-extra3';
import { siteUrl } from './site-url';

/** Controlla i link esterni degli articoli più recenti (HEAD, poi GET se serve) e registra quelli rotti. Chiamato dal cron giornaliero. */
export async function checkBrokenLinks(maxArticles = 60, maxLinks = 250): Promise<string> {
  const articles = await repo.listArticles({ status: 'published' }, 'updated', maxArticles);
  const base = siteUrl(); const seen = new Set<string>(); let checked = 0, broken = 0, healed = 0; const { archiveStep, resetArchiveBudget } = await import('./link-archive'); resetArchiveBudget(25);
  for (const a of articles) {
    const urls = [...a.content.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1].replace(/&amp;/g, '&')).filter((u) => !u.startsWith(base) && !seen.has(u));
    await x3.clearBrokenForArticle(a.id);
    for (const url of urls.slice(0, 15)) {
      if (checked >= maxLinks) break; seen.add(url); checked++;
      const r = await probe(url);
      try { if ((await archiveStep(url, !(r.status >= 400 || r.status === 0))) === 'healed') healed++; } catch { /* l'archivio è un di più */ }
      if (r.status >= 400 || r.status === 0) { broken++; await x3.upsertBrokenLink({ id: 'bl_' + createHash('md5').update(a.id + url).digest('hex').slice(0, 12), articleId: a.id, url, status: r.status, error: r.error, checkedAt: new Date().toISOString(), fixed: false }); }
    }
    if (checked >= maxLinks) break;
  }
  return `${checked} link controllati, ${broken} rotti${healed ? `, ${healed} serviti dalla copia archiviata` : ''}`;
}
async function probe(url: string): Promise<{ status: number; error: string }> {
  const opts = { redirect: 'follow' as const, signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 ASTERNews-linkcheck' } };
  try { const h = await fetch(url, { ...opts, method: 'HEAD' }); if (h.status < 400 || h.status === 403 || h.status === 405) { if (h.status < 400) return { status: h.status, error: '' }; const g = await fetch(url, { ...opts, method: 'GET' }); return { status: g.status, error: g.ok ? '' : g.statusText }; } return { status: h.status, error: h.statusText }; }
  catch (e) { return { status: 0, error: (e as Error).name === 'TimeoutError' ? 'timeout' : (e as Error).message.slice(0, 80) }; }
}
