'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import * as x from './repo-extra';
import { Redirect } from './models';
import { articleUrlWith, getCategories } from './queries';
import { uid } from './utils';
import type { ActionResult } from './actions';

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const normPath = (p: string): string => { let v = p.trim(); try { if (/^https?:\/\//i.test(v)) v = new URL(v).pathname; } catch { /* resta com'è */ } v = v.split('?')[0].split('#')[0]; if (!v.startsWith('/')) v = '/' + v; return v.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/'; };

export async function saveRedirectAction(input: { id?: string; fromPath: string; toPath: string; code: number }): Promise<ActionResult> {
  await requirePermission('redirect.manage');
  const fromPath = normPath(input.fromPath); const toPath = input.toPath.trim().startsWith('http') ? input.toPath.trim() : normPath(input.toPath);
  if (fromPath === '/' || fromPath === toPath) return fail('Percorso di origine non valido.');
  await x.upsertRedirect({ id: input.id || uid('rd'), fromPath, toPath, code: input.code === 302 ? 302 : 301, hits: 0, createdAt: new Date().toISOString() });
  await x.deleteNotFound(fromPath);
  revalidatePath('/admin/redirect');
  return ok('Redirect salvato.');
}
export async function deleteRedirectAction(id: string): Promise<ActionResult> { await requirePermission('redirect.manage'); await x.deleteRedirect(id); revalidatePath('/admin/redirect'); return ok('Redirect eliminato.'); }
/** Importa un CSV "da,a[,codice]" (anche con intestazione o separatore ;). */
export async function importRedirectsAction(csv: string): Promise<ActionResult> {
  await requirePermission('redirect.manage');
  const rows: Redirect[] = [];
  for (const line of csv.split(/\r?\n/)) {
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 2 || !cells[0] || !cells[1] || /^(da|from|source|origine)$/i.test(cells[0])) continue;
    const fromPath = normPath(cells[0]); const toPath = cells[1].startsWith('http') ? cells[1] : normPath(cells[1]);
    if (fromPath === '/' || fromPath === toPath) continue;
    rows.push({ id: uid('rd'), fromPath, toPath, code: Number(cells[2]) === 302 ? 302 : 301, hits: 0, createdAt: new Date().toISOString() });
  }
  if (!rows.length) return fail('Nessuna riga valida trovata (formato: /vecchio-percorso,/nuovo-percorso).');
  for (let i = 0; i < rows.length; i += 200) await x.bulkUpsertRedirects(rows.slice(i, i + 200));
  revalidatePath('/admin/redirect');
  return ok(`${rows.length} redirect importati.`);
}
export async function clearNotFoundAction(): Promise<ActionResult> { await requirePermission('redirect.manage'); await x.clearNotFound(); revalidatePath('/admin/redirect'); return ok('Registro 404 svuotato.'); }
export async function deleteNotFoundAction(path: string): Promise<ActionResult> { await requirePermission('redirect.manage'); await x.deleteNotFound(path); revalidatePath('/admin/redirect'); return ok(); }
/** Suggerisce l'articolo più simile a un percorso 404 (per creare il redirect con un clic). */
export async function suggestRedirectAction(path: string): Promise<{ url: string; title: string }[]> {
  await requirePermission('redirect.manage');
  const slug = path.split('/').filter(Boolean).pop()?.replace(/\.html?$/, '') ?? '';
  const words = slug.split(/[-_]+/).filter((w) => w.length > 3).slice(0, 6);
  if (!words.length) return [];
  const cats = await getCategories();
  const exact = await repo.findArticleBySlug(slug, true);
  const hits = (await repo.searchArticles(words.join(' '), 5)).items;
  const list = [...(exact ? [exact] : []), ...hits].filter((a, i, arr) => arr.findIndex((b) => b.id === a.id) === i).slice(0, 5);
  return list.map((a) => ({ url: articleUrlWith(a, cats), title: a.title }));
}
