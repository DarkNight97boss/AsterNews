'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from './auth';
import { can } from './permissions';
import { aiAvailable, askJson, clip } from './ai';
import * as repo from './repo';
import { getCategories } from './queries';
import { addRecord, deleteRecord, findRecord, listRecords } from './records';
import { insertNotification } from './repo-extra3';
import { slugify, stripHtml, uid } from './utils';
import { styleDrift, styleFingerprint, type LiveDatum, type StyleDrift, type StyleFingerprint } from './writing';
import type { Article } from './models';
import type { ActionResult } from './actions';

type R<T> = ActionResult & { data?: T };
const needAi = async (): Promise<string | null> => ((await aiAvailable()) ? null : 'Assistente AI non attivo: inserisci la chiave in Impostazioni → Assistente AI.');
export type RehearsalKind = 'questions' | 'devil' | 'readers' | 'certainty';
export interface Rehearsal { questions?: { where: string; ask: string }[]; devil?: { objection: string; strength: number; fix: string }[]; readers?: { who: string; lostAt: string; why: string }[]; certainty?: { s: string; level: 1 | 2 | 3 }[] }
const PROMPTS: Record<RehearsalKind, string> = {
  questions: 'Sei un caporedattore. NON proporre testo. Trova nel pezzo i punti dove manca una risposta che il lettore si aspetta (chi l\'ha detto? quando? quanto costa? dove? rispetto a cosa? chi paga?). Per ognuno cita le prime parole del passaggio ("where", max 8 parole, copiate) e fai la domanda ("ask"). Massimo 8. JSON: {"questions":[{"where":"...","ask":"..."}]}',
  devil: 'Sei un lettore ostile e preparato. Elenca le obiezioni più forti che si possono muovere a questo articolo (fatti deboli, generalizzazioni, parti in causa non sentite, numeri senza fonte, tono). Per ognuna: "objection", "strength" da 1 a 5, "fix" (cosa aggiungere o verificare, senza riscrivere). Massimo 6, dalla più forte. JSON: {"devil":[...]}',
  readers: 'Simula tre lettori: "Esperto del tema", "Lettore distratto sul telefono", "Quindicenne". Per ognuno indica dove si perde o smette di leggere: "who", "lostAt" (prime parole del passaggio, copiate, max 8), "why" (una frase). JSON: {"readers":[...]}',
  certainty: 'Classifica le frasi fattuali dell\'articolo per livello di sostegno NEL TESTO: 3 = attribuita a una fonte nominata o a un documento, 2 = attribuita in modo vago ("secondo fonti", "si dice") o dato senza origine, 1 = affermazione non sostenuta da nulla. Ignora opinioni dichiarate e frasi di raccordo. Per ogni frase copia ESATTAMENTE le prime 6-10 parole in "s". Massimo 25. JSON: {"certainty":[{"s":"...","level":1}]}',
};
/** Sala prove: l'AI non scrive, fa domande, obietta, si perde, misura quanto è sostenuta ogni frase. */
export async function rehearsalAction(kind: RehearsalKind, title: string, content: string): Promise<R<Rehearsal>> {
  await requireUser(); const no = await needAi(); if (no) return { ok: false, message: no }; if (stripHtml(content).split(/\s+/).length < 60) return { ok: false, message: 'Servono almeno 60 parole per fare una prova.' };
  try { return { ok: true, data: await askJson<Rehearsal>(`${PROMPTS[kind]}\n\nTitolo: ${title}\n\nTesto:\n${clip(stripHtml(content), 9000)}`, { action: `prova:${kind}`, maxTokens: 2500 }) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Impronta di stile: calcolata sugli ultimi testi pubblicati dall'utente, confrontata con quello che sta scrivendo. Nessuna AI. */
export async function styleCheckAction(content: string): Promise<R<{ base: StyleFingerprint; drift: StyleDrift }>> {
  const u = await requireUser(); const mine = await repo.listArticles({ status: 'published', authorId: u.id, includeCircles: true }, 'published', 40); const base = styleFingerprint(mine.map((a) => a.content));
  if (!base || base.samples < 3) return { ok: false, message: 'Servono almeno tre tuoi articoli pubblicati per imparare come scrivi.' }; const drift = styleDrift(base, content); if (!drift) return { ok: false, message: 'Testo troppo breve per confrontarlo.' };
  return { ok: true, data: { base, drift } };
}
/** Bozza parlata: da una trascrizione grezza a un testo ordinato, senza intercalari e con i dubbi segnati [?]. */
export async function structureDictationAction(raw: string): Promise<R<{ title: string; html: string; doubts: string[] }>> {
  await requireUser(); const no = await needAi(); if (no) return { ok: false, message: no }; if (raw.trim().split(/\s+/).length < 30) return { ok: false, message: 'Registra almeno qualche frase.' };
  try { return { ok: true, data: await askJson(`Questa è la trascrizione di un appunto vocale dettato camminando. Trasformala in una bozza ordinata SENZA aggiungere fatti: togli intercalari e ripetizioni, metti in ordine logico, dividi in paragrafi con eventuali <h2>. Dove chi parla esita, si contraddice o dice di dover verificare, lascia nel testo il segno [?] subito dopo il passaggio. "html" usa solo <p>, <h2>, <ul>, <li>. "doubts" elenca le cose da verificare. "title" è un titolo di lavoro.\n\nTrascrizione:\n${clip(raw, 12000)}\n\nJSON: {"title":"...","html":"...","doubts":["..."]}`, { action: 'bozza-parlata', maxTokens: 4000 }) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Appunti che maturano. */
export async function addSeedAction(text: string): Promise<ActionResult> { const u = await requireUser(); if (text.trim().length < 4) return { ok: false, message: 'Scrivi almeno due parole.' }; await addRecord('seed', { owner: u.id, data: { text: text.trim().slice(0, 600) } }); revalidatePath('/admin/officina'); return { ok: true, message: 'Appunto salvato.' }; }
export async function deleteSeedAction(id: string): Promise<ActionResult> { const u = await requireUser(); const r = await findRecord(id); if (!r || r.owner !== u.id) return { ok: false, message: 'Appunto non trovato.' }; await deleteRecord(id); revalidatePath('/admin/officina'); return { ok: true, message: 'Appunto eliminato.' }; }
export async function seedsToDraftAction(ids: string[], theme: string): Promise<ActionResult & { id?: string }> {
  const u = await requireUser(); const seeds = (await listRecords<{ text: string }>('seed', { owner: u.id })).filter((s) => ids.includes(s.id)); if (!seeds.length) return { ok: false, message: 'Nessun appunto selezionato.' };
  const now = new Date().toISOString(); const cats = await getCategories(); const id = uid('a'); const title = `Appunti su «${theme}»`;
  const a: Article = { id, slug: `${slugify(title)}-${id.slice(-4)}`, kicker: '', title, subtitle: '', excerpt: '', content: `<ul>${seeds.map((s) => `<li>${s.data.text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))}</li>`).join('')}</ul>`, coverImage: '', coverCaption: '', categoryId: cats[0]?.id ?? '', tagIds: [], authorId: u.id, zoneId: '', address: '', status: 'draft', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now };
  await repo.upsertArticle(a); for (const s of seeds) await deleteRecord(s.id); revalidatePath('/admin/officina'); return { ok: true, message: 'Bozza creata dagli appunti.', id };
}
/** Sessioni di scrittura: restano private, servono solo a chi scrive. */
export async function logSessionAction(words: number, minutes: number): Promise<ActionResult> { const u = await requireUser(); if (minutes < 1) return { ok: false, message: 'Sessione troppo breve.' }; await addRecord('session', { owner: u.id, data: { words: Math.max(0, Math.round(words)), minutes: Math.round(minutes), day: new Date().toISOString().slice(0, 10) } }); revalidatePath('/admin/officina'); return { ok: true, message: 'Sessione registrata.' }; }
/** Numeri collegati alla fonte: si aggiornano qui e cambiano in tutti gli articoli che li citano con {{dato:chiave}}. */
export async function saveDatumAction(d: LiveDatum): Promise<ActionResult> {
  const u = await requireUser(); if (!can(u, 'article.publish')) return { ok: false, message: 'Permesso negato.' }; const key = slugify(d.key).slice(0, 40); if (!key || !d.value.trim()) return { ok: false, message: 'Servono una chiave e un valore.' };
  await addRecord('datum', { id: `dat_${key}`, owner: u.id, data: { key, label: d.label.trim().slice(0, 120) || key, value: d.value.trim().slice(0, 60), source: d.source.trim().slice(0, 200), updatedAt: new Date().toISOString() } }); revalidatePath('/admin/officina'); revalidatePath('/', 'layout'); return { ok: true, message: `Dato aggiornato: cambia in tutti gli articoli che usano {{dato:${key}}}.` };
}
export async function deleteDatumAction(key: string): Promise<ActionResult> { const u = await requireUser(); if (!can(u, 'article.publish')) return { ok: false, message: 'Permesso negato.' }; await deleteRecord(`dat_${key}`); revalidatePath('/admin/officina'); return { ok: true, message: 'Dato eliminato.' }; }
/** Cimitero delle bozze: una bozza abbandonata resta consultabile con il motivo, e si può ripescare. */
export async function abandonDraftAction(id: string, why: string): Promise<ActionResult> {
  const u = await requireUser(); const a = await repo.findArticle(id); if (!a || a.status === 'published') return { ok: false, message: 'Si possono abbandonare solo le bozze.' }; if (a.authorId !== u.id && !can(u, 'article.edit.any')) return { ok: false, message: 'Permesso negato.' };
  await repo.patchArticle(id, { extra: JSON.stringify({ ...(a.extra ?? {}), abandoned: why.trim() ? { why: why.trim().slice(0, 300), at: new Date().toISOString() } : undefined }) }); revalidatePath('/admin/officina'); revalidatePath('/admin/articoli'); return { ok: true, message: why.trim() ? 'Bozza messa da parte: la ritrovi nell\'Officina.' : 'Bozza ripescata.' };
}
/** Staffetta: passi il pezzo a un collega con un biglietto, anche vocale. */
export async function handoffAction(articleId: string, toUserId: string, note: string, audio: string): Promise<ActionResult> {
  const u = await requireUser(); const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Salva prima l\'articolo.' }; if (!toUserId || toUserId === u.id) return { ok: false, message: 'Scegli a chi passare il pezzo.' };
  if (!note.trim() && !audio) return { ok: false, message: 'Lascia un biglietto, scritto o a voce.' }; if (audio.length > 900_000) return { ok: false, message: 'Il vocale è troppo lungo: resta sotto il minuto.' };
  await addRecord('handoff', { ref: articleId, owner: toUserId, data: { from: u.id, fromName: u.name, note: note.trim().slice(0, 1000), audio: audio.startsWith('data:audio/') ? audio : '', title: a.title } });
  await insertNotification({ id: uid('nf'), userId: toUserId, kind: 'review', text: `${u.name} ti passa «${a.title}»${note.trim() ? `: ${note.trim().slice(0, 80)}` : ' con un biglietto vocale'}`, url: `/admin/articoli/${articleId}`, read: false, createdAt: new Date().toISOString() });
  return { ok: true, message: 'Pezzo passato: il collega trova il tuo biglietto aprendo l\'articolo.' };
}
export async function handoffsAction(articleId: string): Promise<{ id: string; fromName: string; note: string; audio: string; at: string }[]> { const u = await requireUser(); return (await listRecords<{ fromName: string; note: string; audio: string }>('handoff', { ref: articleId, owner: u.id, limit: 5 })).map((r) => ({ id: r.id, fromName: r.data.fromName, note: r.data.note, audio: r.data.audio, at: r.createdAt })); }
