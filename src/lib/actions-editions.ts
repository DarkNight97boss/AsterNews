'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import * as x from './repo-extra';
import { Edition } from './models';
import { slugify, uid } from './utils';
import type { ActionResult } from './actions';

export async function saveEditionAction(e: Edition): Promise<ActionResult> {
  await requirePermission('settings.manage');
  if (!e.name.trim()) return { ok: false, message: 'Il nome è obbligatorio.' };
  const domain = e.domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const ed: Edition = { ...e, id: e.id || uid('ed'), slug: slugify(e.slug || e.name), name: e.name.trim(), domain, createdAt: e.createdAt || new Date().toISOString() };
  await x.upsertEdition(ed);
  revalidateTag('articles', 'max'); revalidatePath('/', 'layout');
  return { ok: true, message: 'Edizione salvata.', id: ed.id };
}
export async function deleteEditionAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); await x.deleteEdition(id); revalidateTag('articles', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Edizione eliminata.' }; }
