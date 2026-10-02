'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentReader, requirePermission, requireUser } from './auth';
import { aiAvailable, askJson, clip } from './ai';
import * as repo from './repo';
import { getSettings } from './queries';
import { addRecord, deleteRecord, findRecord } from './records';
import { classroomFallback } from './school';
import { stripHtml, uid } from './utils';
import type { AccessSettings, ReaderPrefs } from './models';
import type { ActionResult } from './actions';

/** Articolo in classe: domande di comprensione e glossario (AI se c'è, altrimenti un canovaccio). Li rilegge l'insegnante, non si pubblicano da soli. */
export async function classroomAction(title: string, content: string): Promise<ActionResult & { data?: { questions: string[]; glossary: { term: string; meaning: string }[] } }> {
  await requireUser(); const text = stripHtml(content); if (text.split(/\s+/).length < 60) return { ok: false, message: 'Servono almeno 60 parole.' };
  if (!(await aiAvailable())) return { ok: true, data: classroomFallback(title, text), message: 'Senza AI: domande generiche e parole lunghe da spiegare. Completa a mano.' };
  try { const d = await askJson<{ questions: string[]; glossary: { term: string; meaning: string }[] }>(`Prepara questo articolo per una classe di scuola secondaria di primo grado. "questions": 6-8 domande di comprensione in ordine di difficoltà (le ultime due aprono una discussione). "glossary": 5-8 parole o espressioni difficili presenti nel testo, spiegate in una frase semplice. Non inventare fatti.\n\nTitolo: ${title}\n\n${clip(text, 8000)}\n\nJSON: {"questions":["..."],"glossary":[{"term":"...","meaning":"..."}]}`, { maxTokens: 1500, action: 'articolo-in-classe' }); return { ok: true, data: { questions: (d.questions ?? []).map(String).slice(0, 10), glossary: (d.glossary ?? []).slice(0, 10) } }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Stage di una settimana: uno studente affianca la redazione. */
export async function saveStageAction(s: { id?: string; student: string; school: string; week: string; text: string; articleId: string }): Promise<ActionResult> {
  await requirePermission('article.publish'); if (s.student.trim().length < 3 || !s.week) return { ok: false, message: 'Servono il nome e la settimana.' }; const a = s.articleId.trim() ? await repo.findArticle(s.articleId.trim()) : null;
  await addRecord('stage', { id: s.id || uid('stg'), status: 'approved', data: { student: s.student.trim().slice(0, 80), school: s.school.trim().slice(0, 120), week: s.week.slice(0, 10), text: s.text.trim().slice(0, 1200), articleId: a?.id ?? '', articleTitle: a?.title ?? '' } }); revalidatePath('/stage'); revalidatePath('/admin/scuola'); return { ok: true, message: 'Stage salvato.' };
}
export async function deleteStageAction(id: string): Promise<ActionResult> { await requirePermission('article.publish'); const r = await findRecord(id); if (!r || r.kind !== 'stage') return { ok: false, message: 'Non trovato.' }; await deleteRecord(id); revalidatePath('/stage'); revalidatePath('/admin/scuola'); return { ok: true, message: 'Eliminato.' }; }
export async function saveAccessSettingsAction(a: AccessSettings): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, access: { phone: (a.phone ?? '').slice(0, 40), tutorUserId: (a.tutorUserId ?? '').slice(0, 60), schoolIntro: (a.schoolIntro ?? '').slice(0, 600) } }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Salvato.' }; }
/** Carattere grande e contrasto come profilo: con l'account la scelta segue il lettore su ogni dispositivo. */
export async function saveA11yAction(p: NonNullable<ReaderPrefs['a11y']>): Promise<ActionResult> { const r = await getCurrentReader(); if (!r) return { ok: false, message: 'Senza account la scelta resta solo su questo dispositivo.' }; const ok = ['normal', 'large', 'xlarge'].includes(p.font) && ['normal', 'high'].includes(p.contrast) && ['normal', 'reduce'].includes(p.motion); if (!ok) return { ok: false, message: 'Valori non validi.' }; const x3 = await import('./repo-extra3'); await x3.savePrefs(r.id, { ...(r.prefs ?? {}), a11y: p }); return { ok: true, message: 'Salvato nel tuo profilo: vale su ogni dispositivo da cui accedi.' }; }
