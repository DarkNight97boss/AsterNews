'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission, requireUser } from './auth';
import * as repo from './repo';
import * as x3 from './repo-extra3';
import { DEFAULT_MENUS, MenuItem, MenusSettings, Page } from './models';
import { getSettings } from './queries';
import { slugify, uid } from './utils';
import type { ActionResult } from './actions';

const RESERVED = new Set(['admin', 'login', 'setup', 'api', 'account', 'annunci', 'necrologi', 'notizie', 'eventi', 'zone', 'meteo', 'video', 'foto', 'cerca', 'tag', 'autore', 'segnalazioni', 'newsletter', 'sostieni', 'sitemap.xml', 'feed.xml', 'robots.txt']);

export async function savePageAction(p: Page): Promise<ActionResult> {
  const me = await requireUser();
  if (!['admin', 'editor'].includes(me.role)) return { ok: false, message: 'Solo amministratori e caporedattori gestiscono le pagine.' };
  if (!p.title.trim()) return { ok: false, message: 'Il titolo è obbligatorio.' };
  let slug = slugify(p.slug || p.title) || 'pagina';
  if (RESERVED.has(slug) || (await repo.findCategoryBySlug(slug))) return { ok: false, message: `Lo slug «${slug}» è riservato o già usato da una categoria.` };
  const id = p.id || uid('pg'); let n = 2; const root = slug;
  while (await x3.pageSlugExists(slug, id)) slug = `${root}-${n++}`;
  const now = new Date().toISOString();
  await x3.upsertPage({ ...p, id, slug, createdAt: p.createdAt || now, updatedAt: now, authorId: p.authorId || me.id, seo: { title: p.seo?.title ?? '', description: p.seo?.description ?? '', canonical: p.seo?.canonical ?? '', noIndex: !!p.seo?.noIndex } });
  await repo.insertActivity({ id: uid('ac'), userId: me.id, action: 'ha salvato la pagina', target: p.title, createdAt: now });
  revalidateTag('taxonomy', 'max'); revalidatePath('/', 'layout');
  return { ok: true, message: 'Pagina salvata.', id };
}
export async function deletePageAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); await x3.deletePage(id); revalidateTag('taxonomy', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Pagina eliminata.' }; }
export async function listPagesAction(): Promise<Page[]> { await requireUser(); return x3.listPages(false); }

/** Menu personalizzati (testata e piè di pagina): voci con etichetta e URL, sottovoci per la testata. */
export async function saveMenusAction(m: MenusSettings): Promise<ActionResult> {
  await requirePermission('settings.manage');
  const clean = (items: MenuItem[], depth = 0): MenuItem[] => items.filter((i) => i.label.trim() && i.url.trim()).slice(0, 40).map((i) => ({ id: i.id || uid('mi'), label: i.label.trim().slice(0, 40), url: i.url.trim(), ...(depth === 0 && i.children?.length ? { children: clean(i.children, 1) } : {}) }));
  const s = await getSettings();
  await repo.saveSettingsRow({ ...s, menus: { ...DEFAULT_MENUS, ...m, header: clean(m.header), footer: clean(m.footer) } });
  revalidateTag('settings', 'max'); revalidatePath('/', 'layout');
  return { ok: true, message: 'Menu salvati.' };
}

// ---------------- Blocchi riutilizzabili ----------------
export async function saveSnippetAction(s: import('./models').Snippet): Promise<ActionResult> {
  const me = await requireUser(); if (!['admin', 'editor'].includes(me.role)) return { ok: false, message: 'Solo amministratori e caporedattori gestiscono i blocchi.' };
  if (!s.name.trim()) return { ok: false, message: 'Dai un nome al blocco.' };
  const id = s.id || uid('sn'); await x3.upsertSnippet({ id, name: s.name.trim().slice(0, 80), html: s.html, updatedAt: new Date().toISOString() });
  revalidateTag('articles', 'max'); revalidatePath('/', 'layout'); revalidatePath('/admin/blocchi');
  return { ok: true, message: 'Blocco salvato.', id };
}
export async function deleteSnippetAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); await x3.deleteSnippet(id); revalidateTag('articles', 'max'); revalidatePath('/', 'layout'); revalidatePath('/admin/blocchi'); return { ok: true, message: 'Blocco eliminato.' }; }
export async function listSnippetsAction(): Promise<{ id: string; name: string }[]> { await requireUser(); return (await x3.listSnippets()).map((s) => ({ id: s.id, name: s.name })); }

// ---------------- Campi personalizzati per categoria ----------------
export async function customFieldsAction(): Promise<Record<string, import('./models').CustomField[]>> { await requireUser(); return (await getSettings()).customFields ?? {}; }
export async function saveCustomFieldsAction(categoryId: string, fields: import('./models').CustomField[]): Promise<ActionResult> {
  await requirePermission('category.manage'); const s = await getSettings();
  const clean = fields.filter((f) => f.key.trim() && f.label.trim()).slice(0, 20).map((f) => ({ key: slugify(f.key).replace(/-/g, '_').slice(0, 30), label: f.label.trim().slice(0, 40), type: f.type, ...(f.options ? { options: f.options } : {}) }));
  await repo.saveSettingsRow({ ...s, customFields: { ...(s.customFields ?? {}), [categoryId]: clean } });
  revalidateTag('settings', 'max'); revalidatePath('/admin/categorie');
  return { ok: true, message: 'Campi salvati.' };
}
