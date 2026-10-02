'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import { getSettings } from './queries';
import { addRecord, deleteRecord, findRecord } from './records';
import { cardSlug } from './civic';
import { uid } from './utils';
import type { SectionSponsor } from './models';
import type { ActionResult } from './actions';

/** Sponsor di sezione: un'azienda sostiene una sezione con nome in testata, contratto pubblicato, senza toccare i contenuti. */
export async function saveSponsorAction(categoryId: string, sp: SectionSponsor | null): Promise<ActionResult> {
  await requirePermission('settings.manage'); const s = await getSettings(); const sponsors = { ...(s.sponsors ?? {}) };
  if (!sp || !sp.name.trim()) delete sponsors[categoryId]; else sponsors[categoryId] = { name: sp.name.trim().slice(0, 80), logo: /^https?:\/\//.test(sp.logo) ? sp.logo.slice(0, 300) : '', url: /^https?:\/\//.test(sp.url) ? sp.url.slice(0, 300) : '', contractUrl: /^https?:\/\//.test(sp.contractUrl) ? sp.contractUrl.slice(0, 300) : '', until: sp.until.slice(0, 10), note: sp.note.slice(0, 300) };
  await repo.saveSettingsRow({ ...s, sponsors }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: sp?.name.trim() ? 'Sponsor di sezione salvato.' : 'Sponsor rimosso.' };
}
export interface Fund { slug: string; title: string; intro: string; goal: number; raised: number; status: 'open' | 'done' | 'closed'; updates: string; expenses: string; articleId: string }
/** Crowdfunding per inchiesta: obiettivo, aggiornamenti, resoconto delle spese. Il raccolto si somma dalle donazioni con «inchiesta:<slug>» più quanto inserito a mano. */
export async function saveFundAction(id: string, f: Fund): Promise<ActionResult> { await requirePermission('settings.manage'); if (f.title.trim().length < 5 || !(Number(f.goal) > 0)) return { ok: false, message: 'Servono un titolo e un obiettivo in euro.' }; await addRecord('fund', { id: id || uid('fnd'), status: 'approved', data: { slug: cardSlug(f.slug || f.title), title: f.title.trim().slice(0, 140), intro: f.intro.trim().slice(0, 1500), goal: Math.round(Number(f.goal)), raised: Math.max(0, Math.round(Number(f.raised) || 0)), status: f.status, updates: f.updates.slice(0, 8000), expenses: f.expenses.slice(0, 4000), articleId: f.articleId.trim().slice(0, 40) } }); revalidatePath('/inchieste'); revalidatePath('/admin/economia'); return { ok: true, message: 'Inchiesta salvata.' }; }
export async function deleteFundAction(id: string): Promise<ActionResult> { await requirePermission('settings.manage'); const r = await findRecord(id); if (!r || r.kind !== 'fund') return { ok: false, message: 'Non trovata.' }; await deleteRecord(id); revalidatePath('/inchieste'); revalidatePath('/admin/economia'); return { ok: true, message: 'Eliminata.' }; }
