'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from './auth';
import { aiAvailable, ask, askJson, clip } from './ai';
import * as repo from './repo';
import { articleUrlWith, getCategories, search } from './queries';
import { guardRate } from './ratelimit';
import { addRecord, findRecord, listRecords } from './records';
import { stripCircles } from './circles';
import { codeFromBytes, mindShift, normalizeCode, topHighlights, type Stance } from './reading';
import { stripHtml } from './utils';
import type { AltVersion } from './models';
import type { ActionResult } from './actions';
import { mindStats } from './reading-data';

const pub = async (id: string) => { const a = await repo.findArticle(id); return a && a.status === 'published' && !a.extra?.circle ? a : null; };
/** Riprendi da dove eri: nessun account, solo un codice di tre parole valido 30 giorni. */
export async function saveSpotAction(path: string, pos: number, title: string): Promise<ActionResult & { code?: string }> {
  if (await guardRate('segnalibro', 10, 600_000)) return { ok: false, message: 'Troppi codici in poco tempo: riprova tra qualche minuto.' }; if (!/^\/[\w\-/.%]*$/.test(path) || path.startsWith('/admin')) return { ok: false, message: 'Pagina non valida.' };
  for (let i = 0; i < 6; i++) { const code = codeFromBytes([...randomBytes(3)]); if (await findRecord(`spot_${code}`)) continue; await addRecord('spot', { id: `spot_${code}`, data: { path, pos: Math.min(1, Math.max(0, pos)), title: title.slice(0, 160) }, dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString() }); return { ok: true, code }; }
  return { ok: false, message: 'Non riesco a creare un codice: riprova.' };
}
export async function findSpotAction(raw: string): Promise<ActionResult & { url?: string; title?: string }> {
  if (await guardRate('riprendi', 12, 600_000)) return { ok: false, message: 'Troppi tentativi: riprova tra qualche minuto.' }; const r = await findRecord<{ path: string; pos: number; title: string }>(`spot_${normalizeCode(raw)}`);
  if (!r || (r.dueAt && r.dueAt < new Date().toISOString())) return { ok: false, message: 'Codice non trovato o scaduto. Controlla le tre parole.' }; return { ok: true, url: `${r.data.path}?pos=${r.data.pos.toFixed(3)}`, title: r.data.title };
}
/** Ciò che ti sei perso dall'ultima visita, ordinato secondo le sezioni che leggi di più (le manda il browser, non le conserviamo). */
export async function missedAction(sinceIso: string, favourite: string[]): Promise<{ title: string; url: string; kicker: string; why: string }[]> {
  const since = new Date(sinceIso); if (Number.isNaN(+since) || Date.now() - +since < 6 * 3_600_000) return []; const from = new Date(Math.max(+since, Date.now() - 14 * 86_400_000)).toISOString();
  const [arts, cats] = await Promise.all([repo.listArticles({ status: 'published', from }, 'published', 80), getCategories()]); const fav = favourite.slice(0, 5).map((f) => f.toLowerCase());
  return arts.map((a) => { const cat = cats.find((c) => c.id === a.categoryId); const f = fav.indexOf((cat?.name ?? '').toLowerCase()); const score = (a.breaking ? 50 : 0) + (a.featured ? 20 : 0) + (f >= 0 ? 40 - f * 6 : 0) + Math.min(30, Math.log10(1 + a.views) * 10) + ((a.extra?.corrections?.length ?? 0) ? 15 : 0); return { a, cat, f, score }; })
    .sort((x, y) => y.score - x.score).slice(0, 6).map(({ a, cat, f }) => ({ title: a.extra?.titles?.home || a.title, url: articleUrlWith(a, cats), kicker: cat?.name ?? '', why: a.breaking ? 'ultim\'ora mentre non c\'eri' : f >= 0 ? `perché leggi spesso ${cat?.name}` : a.featured ? 'in evidenza' : 'tra i più letti' }));
}
/** Spiegami questa frase: il contesto viene solo dall'archivio del sito, mai dal web. */
export async function explainAction(articleId: string, passage: string): Promise<ActionResult & { text?: string; links?: { title: string; url: string }[] }> {
  if (await guardRate('spiega', 8, 600_000)) return { ok: false, message: 'Hai fatto molte richieste: riprova tra poco.' }; const a = await pub(articleId); const q = passage.trim().slice(0, 300); if (!a || q.length < 12) return { ok: false, message: 'Seleziona una frase un po\' più lunga.' };
  const { keywords } = await import('./writing'); const cats = await getCategories(); const terms = keywords(q).slice(0, 5); const seen = new Set([a.id]); const found: { title: string; url: string; excerpt: string }[] = [];
  for (const t of terms) { for (const it of (await search(t, 4)).items) { if (seen.has(it.id)) continue; seen.add(it.id); found.push({ title: it.title, url: articleUrlWith(it, cats), excerpt: `${it.excerpt || ''} ${stripHtml(stripCircles(it.content)).slice(0, 500)}` }); } if (found.length >= 4) break; }
  const links = found.slice(0, 4).map(({ title, url }) => ({ title, url })); if (!links.length) return { ok: true, text: 'Nel nostro archivio non c\'è altro su questo passaggio.', links: [] };
  if (!(await aiAvailable())) return { ok: true, links };
  try { const text = await ask(`Un lettore ha selezionato questo passaggio di un articolo e chiede il contesto:\n«${q}»\n\nUsa SOLO le informazioni di questi estratti dell'archivio del giornale. Se non bastano, dillo. Rispondi in 2-3 frasi semplici, senza inventare.\n\n${found.slice(0, 4).map((f, i) => `[${i + 1}] ${f.title}: ${clip(f.excerpt, 700)}`).join('\n')}`, { maxTokens: 300, effort: 'low', action: 'spiega-frase' }); return { ok: true, text, links }; } catch { return { ok: true, links }; }
}
/** Articolo in forma di conversazione: risponde solo con ciò che il pezzo contiene. */
export async function askArticleAction(articleId: string, question: string): Promise<ActionResult & { answer?: string }> {
  if (await guardRate('chiedi-articolo', 6, 600_000)) return { ok: false, message: 'Hai fatto molte domande: riprova tra poco.' }; const a = await pub(articleId); if (!a || question.trim().length < 5) return { ok: false, message: 'Scrivi una domanda.' };
  if (!(await aiAvailable())) return { ok: false, message: 'Questa funzione non è attiva su questo sito.' };
  try { return { ok: true, answer: await ask(`Rispondi alla domanda del lettore usando ESCLUSIVAMENTE il testo dell'articolo qui sotto. Se l'articolo non lo dice, rispondi: «L'articolo non lo dice.» e indica eventualmente cosa dice di vicino. Massimo 4 frasi, in italiano semplice, senza opinioni.\n\nARTICOLO: ${a.title}\n${clip(stripHtml(stripCircles(a.content)), 9000)}\n\nDOMANDA: ${question.trim().slice(0, 300)}`, { maxTokens: 350, effort: 'low', action: 'chiedi-articolo' }) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Evidenziazioni collettive e grazie mirato: anonimi, con limite di frequenza. */
export async function highlightAction(articleId: string, text: string): Promise<ActionResult> { if (await guardRate('evidenzia', 20, 600_000)) return { ok: false, message: 'Hai sottolineato molto: riprova tra poco.' }; const t = text.trim().replace(/\s+/g, ' '); if (t.length < 12 || t.length > 400 || !(await pub(articleId))) return { ok: false, message: 'Seleziona una frase.' }; await addRecord('highlight', { ref: articleId, data: { text: t.slice(0, 200) } }); return { ok: true, message: 'Sottolineato. Le frasi più sottolineate diventano visibili a tutti.' }; }
export async function thanksAction(articleId: string, text: string): Promise<ActionResult> { if (await guardRate('grazie', 10, 600_000)) return { ok: false, message: 'Grazie dei grazie! Riprova tra poco.' }; const t = text.trim().replace(/\s+/g, ' '); if (t.length < 12 || !(await pub(articleId))) return { ok: false, message: 'Seleziona il passaggio per cui vuoi ringraziare.' }; await addRecord('thanks', { ref: articleId, data: { text: t.slice(0, 200) } }); return { ok: true, message: 'Grazie recapitato all\'autore, con il passaggio che hai scelto.' }; }
/** Lettura condivisa: una stanza con un codice; le sottolineature di chi è dentro compaiono agli altri. */
export async function coreadCreateAction(articleId: string): Promise<ActionResult & { code?: string }> { if (await guardRate('insieme', 5, 600_000)) return { ok: false, message: 'Riprova tra poco.' }; if (!(await pub(articleId))) return { ok: false, message: 'Articolo non trovato.' }; const code = codeFromBytes([...randomBytes(3)]); await addRecord('coread', { id: `co_${code}_${articleId}`.slice(0, 120), ref: articleId, data: { code }, dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }); return { ok: true, code }; }
export async function coreadAddAction(articleId: string, code: string, who: string, text: string): Promise<ActionResult> { if (await guardRate('insieme-hl', 40, 600_000)) return { ok: false, message: 'Riprova tra poco.' }; const c = normalizeCode(code); if (!(await findRecord(`co_${c}_${articleId}`.slice(0, 120)))) return { ok: false, message: 'Stanza non trovata.' }; const t = text.trim().replace(/\s+/g, ' '); if (t.length < 8) return { ok: false, message: 'Seleziona una frase.' }; await addRecord('coread-hl', { ref: `${c}:${articleId}`, data: { who: who.trim().slice(0, 30) || 'Ospite', text: t.slice(0, 300) } }); return { ok: true }; }
export async function coreadListAction(articleId: string, code: string): Promise<{ who: string; text: string }[]> { const c = normalizeCode(code); return (await listRecords<{ who: string; text: string }>('coread-hl', { ref: `${c}:${articleId}`, limit: 200, order: 'old' })).map((r) => r.data); }
/** Ho cambiato idea. */
export async function mindAction(articleId: string, before: Stance, after: Stance): Promise<ActionResult & { stats?: ReturnType<typeof mindShift> }> {
  if (await guardRate('idea', 6, 3_600_000)) return { ok: false, message: 'Hai già risposto di recente.' }; const a = await pub(articleId); const ok = ['si', 'forse', 'no']; if (!a?.extra?.mindQuestion || !ok.includes(before) || !ok.includes(after)) return { ok: false, message: 'Risposta non valida.' };
  await addRecord('mind', { ref: articleId, data: { before, after } }); return { ok: true, stats: await mindStats(articleId) };
}
/** Risposte lunghe al posto dei commenti: un contro-articolo che la redazione può pubblicare accanto. */
export async function longResponseAction(articleId: string, input: { name: string; email: string; title: string; text: string }): Promise<ActionResult> {
  if (await guardRate('risposta-lunga', 2, 3_600_000)) return { ok: false, message: 'Hai già inviato una risposta da poco.' }; const a = await pub(articleId); if (!a) return { ok: false, message: 'Articolo non trovato.' };
  if (input.name.trim().length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim()) || input.title.trim().length < 8 || input.text.trim().split(/\s+/).length < 120) return { ok: false, message: 'Servono nome, email, un titolo e almeno 120 parole: è una risposta, non un commento.' };
  await addRecord('response', { ref: articleId, status: 'pending', data: { name: input.name.trim().slice(0, 100), email: input.email.trim().toLowerCase(), title: input.title.trim().slice(0, 140), text: input.text.trim().slice(0, 12000), articleTitle: a.title } }); return { ok: true, message: 'Ricevuta. La redazione la legge e, se la pubblica, comparirà accanto all\'articolo con il tuo nome.' };
}
/** Versione per bambini e versione in lingua facile: le prepara l'AI, le rilegge e le corregge una persona prima di pubblicarle. */
export async function altVersionAction(kind: 'kids' | 'easy', title: string, content: string): Promise<ActionResult & { data?: AltVersion }> {
  await requireUser(); if (!(await aiAvailable())) return { ok: false, message: 'Assistente AI non attivo.' };
  const brief = kind === 'kids' ? 'per bambini di 8-11 anni: frasi brevi, esempi concreti, nessun dettaglio cruento, nessuna semplificazione falsa; se il tema non è adatto ai bambini spiega solo il fatto essenziale con delicatezza' : 'in lingua facile per chi sta imparando l\'italiano (livello A2): frasi di massimo 12 parole, verbi al presente o passato prossimo, una informazione per frase, niente modi di dire';
  try { const d = await askJson<AltVersion>(`Riscrivi questo articolo ${brief}. Non aggiungere fatti e non toglierne di essenziali. "html" usa solo <p> e <h2>. "glossary": 4-8 parole difficili rimaste nel testo, spiegate in una frase semplice.\n\nTitolo: ${title}\n\n${clip(stripHtml(content), 9000)}\n\nJSON: {"html":"...","glossary":[{"term":"...","meaning":"..."}]}`, { maxTokens: 4000, action: `versione:${kind}` }); return { ok: true, data: { html: String(d.html ?? ''), glossary: (d.glossary ?? []).slice(0, 10) } }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
