'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import { addRecord, deleteRecord, listRecords } from './records';
import { slugify, uid } from './utils';
import type { ActionResult } from './actions';

export interface ReadingPath { slug: string; title: string; intro: string; steps: { articleId: string; note: string }[] }
/** Percorsi di lettura: serie guidate («capire il bilancio comunale in 5 tappe») fatte di articoli già pubblicati, ognuno con una riga che spiega perché leggerlo. */
export async function savePathAction(id: string, p: ReadingPath): Promise<ActionResult> {
  await requirePermission('article.publish'); const title = p.title.trim(); if (title.length < 5) return { ok: false, message: 'Dai un titolo al percorso.' };
  const steps: ReadingPath['steps'] = []; for (const s of p.steps.slice(0, 12)) { const a = await repo.findArticle(s.articleId.trim()) ?? (await repo.listArticles({ status: 'published', q: s.articleId.trim().split('/').filter(Boolean).pop() ?? '' }, 'published', 1))[0]; if (a && a.status === 'published' && !a.extra?.circle && !steps.some((x) => x.articleId === a.id)) steps.push({ articleId: a.id, note: s.note.trim().slice(0, 240) }); }
  if (steps.length < 2) return { ok: false, message: 'Servono almeno due articoli pubblicati (incolla l\'indirizzo o l\'id).' };
  await addRecord('path', { id: id || uid('pth'), status: 'approved', data: { slug: slugify(p.slug || title).slice(0, 60), title: title.slice(0, 120), intro: p.intro.trim().slice(0, 500), steps } }); revalidatePath('/percorsi'); revalidatePath('/admin/percorsi'); return { ok: true, message: `Percorso salvato con ${steps.length} tappe.` };
}
export async function deletePathAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); await deleteRecord(id); revalidatePath('/percorsi'); revalidatePath('/admin/percorsi'); return { ok: true, message: 'Percorso eliminato.' }; }
