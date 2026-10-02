'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import { addRecord, deleteRecord, findRecord } from './records';
import { uid } from './utils';
import type { ActionResult } from './actions';

/** La vignetta della settimana: fatta da una persona, non dall'AI. */
export async function saveVignettaAction(v: { image: string; caption: string; articleId: string; author: string }): Promise<ActionResult> { await requirePermission('article.publish'); if (!/^https?:\/\//.test(v.image)) return { ok: false, message: 'Serve l\'indirizzo dell\'immagine (caricala dalla Libreria media).' }; await addRecord('vignetta', { id: uid('vg'), status: 'approved', data: { image: v.image.slice(0, 400), caption: v.caption.trim().slice(0, 300), articleId: v.articleId.trim().slice(0, 40), author: v.author.trim().slice(0, 80) } }); revalidatePath('/vignette'); revalidatePath('/admin/formati'); return { ok: true, message: 'Vignetta pubblicata.' }; }
export async function deleteVignettaAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); const r = await findRecord(id); if (!r || r.kind !== 'vignetta') return { ok: false, message: 'Non trovata.' }; await deleteRecord(id); revalidatePath('/vignette'); revalidatePath('/admin/formati'); return { ok: true, message: 'Eliminata.' }; }
export async function makeRadioNowAction(): Promise<ActionResult> { await requirePermission('article.publish'); try { const { makeRadio } = await import('./formats-data'); const r = await makeRadio(); revalidatePath('/radio'); return r ? { ok: true, message: r } : { ok: false, message: 'Niente da registrare: serve la voce sintetica configurata, almeno due articoli, e non più di una registrazione al giorno.' }; } catch (e) { return { ok: false, message: (e as Error).message }; } }
export async function sendEreaderNowAction(): Promise<ActionResult> { await requirePermission('settings.manage'); try { const { sendEreaderEdition } = await import('./formats-data'); const r = await sendEreaderEdition(true); return r ? { ok: true, message: r } : { ok: false, message: 'Nessun invio: servono email configurata, iscritti e articoli della settimana.' }; } catch (e) { return { ok: false, message: (e as Error).message }; } }
