import 'server-only';
import { all, get, run } from './db';
import { aiSettings } from './ai';
import * as repo from './repo';
import type { Article } from './models';
import { stripHtml } from './utils';

/** Ricerca semantica: embedding (OpenAI o Voyage) di titolo+sommario+inizio testo, salvati in tabella e tenuti in memoria per la similarità del coseno. */
const DIMS = 256;
export async function embeddingsEnabled(): Promise<boolean> { const s = await aiSettings(); return (s.embeddingsProvider ?? 'none') !== 'none' && !!s.embeddingsKey; }
export async function embed(texts: string[]): Promise<number[][]> {
  const s = await aiSettings(); const key = s.embeddingsKey ?? ''; if (!key) throw new Error('Embedding non configurati');
  if (s.embeddingsProvider === 'voyage') { const r = await fetch('https://api.voyageai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: texts, model: 'voyage-3-lite', output_dimension: DIMS }), signal: AbortSignal.timeout(30_000) }); const j = await r.json(); if (!r.ok) throw new Error(j.detail ?? 'Voyage error'); return (j.data as { embedding: number[] }[]).map((d) => d.embedding); }
  const r = await fetch('https://api.openai.com/v1/embeddings', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ input: texts, model: 'text-embedding-3-small', dimensions: DIMS }), signal: AbortSignal.timeout(30_000) }); const j = await r.json(); if (!r.ok) throw new Error(j.error?.message ?? 'OpenAI error'); return (j.data as { embedding: number[] }[]).map((d) => d.embedding);
}
const textOf = (a: Article) => `${a.title}. ${a.subtitle}. ${a.excerpt}. ${stripHtml(a.content).slice(0, 1200)}`;
export async function indexArticle(a: Article): Promise<void> { if (!(await embeddingsEnabled())) return; const [v] = await embed([textOf(a)]); await run('INSERT INTO article_embeddings (article_id, vector, updated_at) VALUES (?,?,?) ON CONFLICT (article_id) DO UPDATE SET vector = excluded.vector, updated_at = excluded.updated_at', [a.id, JSON.stringify(v.map((x) => Math.round(x * 10000) / 10000)), a.updatedAt]); cache = null; }
/** Indicizza gli articoli pubblicati mancanti o cambiati (a lotti, chiamato dal cron giornaliero). */
export async function ensureIndex(limit = 200): Promise<string> {
  if (!(await embeddingsEnabled())) return 'non attivo';
  const rows = (await all('SELECT a.id, a.updated_at FROM articles a LEFT JOIN article_embeddings e ON e.article_id = a.id WHERE a.status = \'published\' AND a.deleted_at IS NULL AND (e.article_id IS NULL OR e.updated_at <> a.updated_at) ORDER BY a.published_at DESC LIMIT ?', [limit])) as { id: string }[];
  let n = 0; for (let i = 0; i < rows.length; i += 20) { const batch = (await Promise.all(rows.slice(i, i + 20).map((r) => repo.findArticle(r.id)))).filter((a): a is Article => !!a); if (!batch.length) continue; const vs = await embed(batch.map(textOf)); for (let k = 0; k < batch.length; k++) { await run('INSERT INTO article_embeddings (article_id, vector, updated_at) VALUES (?,?,?) ON CONFLICT (article_id) DO UPDATE SET vector = excluded.vector, updated_at = excluded.updated_at', [batch[k].id, JSON.stringify(vs[k].map((x) => Math.round(x * 10000) / 10000)), batch[k].updatedAt]); n++; } }
  cache = null; return `${n} articoli indicizzati`;
}
let cache: { at: number; rows: { id: string; v: number[] }[] } | null = null;
async function vectors(): Promise<{ id: string; v: number[] }[]> {
  if (cache && Date.now() - cache.at < 600_000) return cache.rows;
  const rows = (await all('SELECT e.article_id, e.vector FROM article_embeddings e JOIN articles a ON a.id = e.article_id WHERE a.status = \'published\' AND a.deleted_at IS NULL ORDER BY a.published_at DESC LIMIT 4000')) as { article_id: string; vector: string }[];
  cache = { at: Date.now(), rows: rows.map((r) => ({ id: r.article_id, v: JSON.parse(r.vector) as number[] })) }; return cache.rows;
}
const cos = (a: number[], b: number[]) => { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; } return d / (Math.sqrt(na) * Math.sqrt(nb) || 1); };
export async function semanticSearch(q: string, n = 10, exclude: string[] = []): Promise<Article[]> {
  if (!(await embeddingsEnabled())) return []; const rows = await vectors(); if (!rows.length) return [];
  const [qv] = await embed([q]); const top = rows.filter((r) => !exclude.includes(r.id)).map((r) => ({ id: r.id, s: cos(qv, r.v) })).sort((a, b) => b.s - a.s).slice(0, n).filter((x) => x.s > 0.25);
  return (await Promise.all(top.map((t) => repo.findArticle(t.id)))).filter((a): a is Article => !!a && a.status === 'published');
}
export async function similarTo(a: Article, n = 4): Promise<Article[]> {
  if (!(await embeddingsEnabled())) return []; const rows = await vectors(); const me = rows.find((r) => r.id === a.id); if (!me) return [];
  const top = rows.filter((r) => r.id !== a.id).map((r) => ({ id: r.id, s: cos(me.v, r.v) })).sort((x, y) => y.s - x.s).slice(0, n);
  return (await Promise.all(top.map((t) => repo.findArticle(t.id)))).filter((x): x is Article => !!x && x.status === 'published');
}
export const embeddingCount = async (): Promise<number> => Number(((await get('SELECT COUNT(*) c FROM article_embeddings')) as { c: number }).c);
