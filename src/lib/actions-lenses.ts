'use server';

import * as repo from './repo';
import { listRevisions } from './repo-extra';
import { stripCircles } from './circles';
import { guardRate } from './ratelimit';

/** Articolo vivo con linea del tempo: le versioni pubblicate, solo se l'autore ha scelto di mostrare la cronologia. Niente blocchi riservati. */
export async function articleVersionsAction(articleId: string): Promise<{ at: string; title: string; html: string }[]> {
  if (await guardRate('versioni', 20, 60_000)) return []; const a = await repo.findArticle(articleId); if (!a || a.status !== 'published' || !a.extra?.showHistory || a.extra.circle) return [];
  const clean = (h: string) => stripCircles(h).replace(/<(script|iframe|style)[\s\S]*?<\/\1>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
  const past = (await listRevisions(a.id, 20)).filter((r) => r.data?.status === 'published').reverse().map((r) => ({ at: r.data.updatedAt || r.createdAt, title: r.data.title, html: clean(r.data.content) }));
  return [...past, { at: a.updatedAt, title: a.title, html: clean(a.content) }];
}
