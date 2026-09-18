import 'server-only';
import { metaGet, metaSet } from './db';
import * as repo from './repo';
import { siteUrl } from './site-url';

/** Monitoraggio sintetico: ogni 15 minuti prova le pagine chiave e registra stato e tempi; due fallimenti di fila → avviso. */
export interface SyntheticResult { url: string; status: number; ms: number; ok: boolean; at: string }
export async function runSynthetic(): Promise<{ results: SyntheticResult[]; alerts: string[] }> {
  const base = siteUrl(); const urls = [`${base}/`, `${base}/feed.xml`, `${base}/api/v1/site`];
  try { const [a] = await repo.listArticles({ status: 'published' }, 'published', 1); const cats = await repo.listCategories(); if (a) urls.push(`${base}/${cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}`); } catch { /* ignora */ }
  const results: SyntheticResult[] = [];
  for (const url of urls) { const t0 = Date.now(); let status = 0; try { const r = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'ASTERNews-synthetic' }, cache: 'no-store' }); status = r.status; } catch { status = 0; } results.push({ url, status, ms: Date.now() - t0, ok: status >= 200 && status < 400, at: new Date().toISOString() }); }
  let prev: SyntheticResult[] = []; try { prev = JSON.parse((await metaGet('synthetic_last')) || '[]'); } catch { prev = []; }
  const alerts = results.filter((r) => !r.ok && prev.find((p) => p.url === r.url && !p.ok)).map((r) => `${r.url.replace(base, '') || '/'} non risponde (stato ${r.status}, ${r.ms} ms)`);
  const slow = results.filter((r) => r.ok && r.ms > 8000).map((r) => `${r.url.replace(base, '') || '/'} lenta: ${r.ms} ms`);
  await metaSet('synthetic_last', JSON.stringify(results));
  let history: SyntheticResult[][] = []; try { history = JSON.parse((await metaGet('synthetic_history')) || '[]'); } catch { history = []; }
  history = [results, ...history].slice(0, 96); await metaSet('synthetic_history', JSON.stringify(history));
  return { results, alerts: [...alerts, ...slow] };
}
export async function syntheticHistory(): Promise<SyntheticResult[][]> { try { return JSON.parse((await metaGet('synthetic_history')) || '[]'); } catch { return []; } }
