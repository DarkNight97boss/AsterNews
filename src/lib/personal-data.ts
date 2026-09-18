import 'server-only';
import * as repo from './repo';
import { search } from './queries';
import { findRecord, listRecords } from './records';
import type { Article } from './models';
import type { Collection, Correspondence } from './actions-personal';

/** Letture per le pagine del sito personale. Stanno fuori dai file 'use server' perché non devono essere richiamabili dal browser. */
export async function collectionArticles(query: string, limit = 60): Promise<Article[]> {
  const seen = new Map<string, Article>(); try { const { embeddingsEnabled, semanticSearch } = await import('./embeddings'); if (await embeddingsEnabled()) for (const a of await semanticSearch(query, 30)) if (a.status === 'published' && !a.extra?.circle) seen.set(a.id, a); } catch { /* ricerca semantica non attiva */ }
  for (const term of query.split(/[,;]|\s+e\s+/).map((t) => t.trim()).filter((t) => t.length >= 3).slice(0, 6)) for (const a of (await search(term, 40)).items) if (!seen.has(a.id)) seen.set(a.id, a);
  return [...seen.values()].sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? '')).slice(0, limit);
}
export async function nowData() { return (await findRecord<Record<string, string>>('now_main'))?.data ?? null; }
export async function personalLists() { const [uses, collections, letters] = await Promise.all([listRecords<Record<string, string>>('uses', { limit: 200, order: 'old' }), listRecords<Collection>('collection', { limit: 100, order: 'old' }), listRecords<Correspondence>('letters', { limit: 100 })]); return { uses, collections, letters }; }
