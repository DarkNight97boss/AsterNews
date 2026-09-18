'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission, requireUser } from './auth';
import { aiAvailable, aiSettings, askJson, clip } from './ai';
import * as repo from './repo';
import { getSettings } from './queries';
import { listRecords } from './records';
import { textHash } from './trust';
import { stripHtml } from './utils';
import type { ArticleOutputs } from './models';
import type { ActionResult } from './actions';

/** Un contenuto, dieci uscite: dallo stesso testo thread, carosello, script video, newsletter, SMS, WhatsApp. Porta l'impronta del testo: se correggi l'articolo, l'editor ti dice che vanno rigenerate. */
export async function outputsAction(title: string, content: string, url: string): Promise<ActionResult & { data?: ArticleOutputs }> {
  await requireUser(); if (!(await aiAvailable())) return { ok: false, message: 'Assistente AI non attivo.' }; if (stripHtml(content).split(/\s+/).length < 80) return { ok: false, message: 'Servono almeno 80 parole.' };
  try { const d = await askJson<Omit<ArticleOutputs, 'hash' | 'at'>>(`Da questo articolo prepara le versioni per altri canali. Non aggiungere fatti, non cambiare i numeri, niente punti esclamativi, niente emoji in eccesso.\n"thread": 4-7 post brevi per X/Threads/Mastodon (max 270 caratteri l'uno, il primo deve reggersi da solo).\n"carousel": 5-8 testi per le slide di un carosello Instagram (max 120 caratteri l'una; la prima è il titolo, l'ultima invita a leggere).\n"video": script per un video verticale di 45-60 secondi, con indicazioni [INQUADRATURA] tra parentesi quadre.\n"newsletter": due paragrafi da newsletter, tono da lettera, in prima persona plurale.\n"sms": massimo 250 caratteri, senza link (lo aggiungiamo noi).\n"whatsapp": 3-4 righe per un canale WhatsApp, con *grassetto* sul fatto principale.\n\nTitolo: ${title}\n\n${clip(stripHtml(content), 9000)}\n\nJSON con quelle sei chiavi.`, { maxTokens: 3500, action: 'dieci-uscite' });
    void url; return { ok: true, data: { hash: textHash(title, content), at: new Date().toISOString(), thread: (d.thread ?? []).map(String).slice(0, 8), carousel: (d.carousel ?? []).map(String).slice(0, 9), video: String(d.video ?? ''), newsletter: String(d.newsletter ?? ''), sms: String(d.sms ?? '').slice(0, 260), whatsapp: String(d.whatsapp ?? '') } }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function outputsStaleAction(title: string, content: string, hash: string): Promise<boolean> { await requireUser(); return textHash(title, content) !== hash; }
/** Podcast a due voci sintetiche in dialogo, sempre dichiarato come tale. Prima il copione (che si può correggere), poi l'audio. */
export async function dialogueScriptAction(title: string, content: string): Promise<ActionResult & { data?: { who: 'A' | 'B'; text: string }[] }> {
  await requireUser(); if (!(await aiAvailable())) return { ok: false, message: 'Assistente AI non attivo.' };
  try { const d = await askJson<{ lines: { who: 'A' | 'B'; text: string }[] }>(`Trasforma questo articolo in un dialogo radiofonico tra due voci: A conduce e fa le domande che farebbe un ascoltatore, B ha letto l'articolo e risponde. 14-22 battute brevi, italiano parlato, nessun fatto che non sia nel testo, nessuna opinione. La prima battuta di A dichiara che le voci sono sintetiche e che il testo viene dall'articolo «${title}».\n\n${clip(stripHtml(content), 9000)}\n\nJSON: {"lines":[{"who":"A","text":"..."}]}`, { maxTokens: 3000, action: 'podcast-due-voci' }); return { ok: true, data: (d.lines ?? []).filter((l) => l.text).slice(0, 26).map((l) => ({ who: l.who === 'B' ? 'B' : 'A', text: String(l.text).slice(0, 600) })) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function dialogueAudioAction(articleId: string, lines: { who: 'A' | 'B'; text: string }[]): Promise<ActionResult & { url?: string }> {
  await requireUser(); const a = await repo.findArticle(articleId); if (!a) return { ok: false, message: 'Salva prima l\'articolo.' }; if (lines.length < 4) return { ok: false, message: 'Il copione è troppo corto.' };
  try { const s = await aiSettings(); const { synthesize } = await import('./tts'); const { uploadRaw } = await import('./storage'); const second = s.ttsProvider === 'elevenlabs' ? 'EXAVITQu4vr4xnSDxMaL' : (s.ttsVoice || 'alloy') === 'nova' ? 'onyx' : 'nova';
    const parts: Buffer[] = []; for (const l of lines.slice(0, 26)) parts.push(await synthesize(l.text, l.who === 'B' ? second : undefined)); const url = await uploadRaw(Buffer.concat(parts), `audio/dialogo-${a.slug.slice(0, 60)}-${Date.now()}.mp3`, 'audio/mpeg'); return { ok: true, message: 'Audio a due voci pronto.', url }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Newsletter che si scrive dalle tue note: appunti della settimana più ciò che hai pubblicato, in una bozza da rifinire. */
export async function newsletterFromNotesAction(): Promise<ActionResult & { data?: { subject: string; html: string } }> {
  const u = await requireUser(); const since = new Date(Date.now() - 7 * 86_400_000).toISOString(); const [seeds, arts, s] = await Promise.all([listRecords<{ text: string }>('seed', { owner: u.id, limit: 100 }), repo.listArticles({ status: 'published', from: since }, 'published', 12), getSettings()]); const notes = seeds.filter((x) => x.createdAt >= since).map((x) => x.data.text);
  if (!notes.length && !arts.length) return { ok: false, message: 'Questa settimana non ci sono né appunti né articoli da cui partire.' };
  const list = arts.map((a) => `<li><b>${a.extra?.titles?.newsletter || a.title}</b>${a.excerpt ? ` — ${a.excerpt}` : ''}</li>`).join('');
  if (!(await aiAvailable())) return { ok: true, data: { subject: `La settimana di ${s.siteName}`, html: `<p>Care lettrici, cari lettori,</p>${notes.length ? `<p>questa settimana mi sono appuntato:</p><ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}${list ? `<p>Abbiamo pubblicato:</p><ul>${list}</ul>` : ''}<p>A presto.</p>` }, message: 'Bozza composta senza AI: appunti e articoli in ordine.' };
  try { const d = await askJson<{ subject: string; html: string }>(`Scrivi la bozza di una newsletter settimanale in prima persona, tono da lettera, 250-400 parole. Parti dagli appunti dell'autore (sono il filo del discorso) e cita gli articoli usciti dove c'entrano. Non inventare fatti: se un appunto è solo un'idea, presentalo come tale. "html" usa solo <p>, <ul>, <li>, <b>.\n\nAPPUNTI DELLA SETTIMANA:\n${notes.map((n) => `- ${n}`).join('\n') || '(nessuno)'}\n\nARTICOLI USCITI:\n${arts.map((a) => `- ${a.title}: ${a.excerpt}`).join('\n') || '(nessuno)'}\n\nJSON: {"subject":"...","html":"..."}`, { maxTokens: 1800, action: 'newsletter-da-note' }); return { ok: true, data: { subject: String(d.subject ?? '').slice(0, 120), html: String(d.html ?? '') }, message: 'Bozza pronta: dieci minuti per rifinirla.' }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function saveAiPolicyAction(notes: string, allowTraining: boolean): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, aiPolicy: { notes: notes.slice(0, 2000), allowTraining } }); revalidateTag('settings', 'max'); revalidatePath('/llms.txt'); return { ok: true, message: 'Indicazioni per gli assistenti AI aggiornate: /llms.txt' }; }
