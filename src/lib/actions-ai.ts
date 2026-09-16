'use server';

import { getCurrentUser, requireUser } from './auth';
import { aiAvailable, ask, askJson, clip } from './ai';
import { getCategories, getSettings } from './queries';
import { stripHtml } from './utils';
import type { ActionResult } from './actions';

type R<T> = ActionResult & { data?: T };
async function guard(): Promise<string | null> { await requireUser(); return (await aiAvailable()) ? null : 'Assistente AI non attivo: inserisci la chiave in Impostazioni → Assistente AI.'; }
const wrap = async <T,>(fn: () => Promise<T>): Promise<R<T>> => { const g = await guard(); if (g) return { ok: false, message: g }; try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, message: (e as Error).message }; } };

export async function aiStatusAction(): Promise<boolean> { return !!(await getCurrentUser()) && (await aiAvailable()); }

/** Cinque titoli alternativi (SEO, social, breve, domanda, con numero). */
export async function aiTitlesAction(title: string, content: string): Promise<R<{ label: string; title: string }[]>> {
  return wrap(() => askJson(`Proponi 5 titoli alternativi per questo articolo, ognuno con un taglio diverso: "SEO" (con la parola chiave all'inizio, max 60 caratteri), "Social" (curioso, max 80), "Breve" (max 40), "Domanda", "Con dato". Titolo attuale: ${title}\n\nTesto:\n${clip(stripHtml(content), 6000)}\n\nJSON: [{"label":"SEO","title":"..."}, ...]`));
}
export async function aiSummaryAction(title: string, content: string): Promise<R<{ subtitle: string; excerpt: string; seoDescription: string; keyPoints: string[] }>> {
  return wrap(() => askJson(`Per l'articolo "${title}" scrivi: "subtitle" (sommario giornalistico, max 160 caratteri), "excerpt" (estratto per le card, max 200), "seoDescription" (meta description, 120-155 caratteri, con la parola chiave), "keyPoints" (3-5 frasi brevi con i fatti principali).\n\nTesto:\n${clip(stripHtml(content))}\n\nJSON con quei quattro campi.`));
}
export async function aiTagsAction(title: string, content: string): Promise<R<{ tags: string[]; category: string; kicker: string }>> {
  const cats = (await getCategories()).map((c) => c.name);
  return wrap(() => askJson(`Articolo: "${title}"\n${clip(stripHtml(content), 6000)}\n\nRestituisci JSON {"tags": [5-8 tag brevi, nomi propri e temi, senza cancelletto], "category": una tra ${JSON.stringify(cats)}, "kicker": occhiello di 1-3 parole in maiuscolo}.`));
}
export async function aiAltTextAction(imageUrl: string, context: string): Promise<R<string>> {
  return wrap(async () => {
    const { aiSettings } = await import('./ai'); const s = await aiSettings();
    const Anthropic = (await import('@anthropic-ai/sdk')).default; const client = new Anthropic({ apiKey: s.apiKey });
    const res = await client.messages.create({ model: s.model, max_tokens: 200, system: 'Scrivi in italiano un testo alternativo (alt) per accessibilità e SEO: una frase concreta, max 120 caratteri, senza "immagine di". Rispondi solo con il testo.', messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url: imageUrl } }, { type: 'text', text: `Contesto dell'articolo: ${context.slice(0, 300)}` }] }] });
    return res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim().replace(/^"|"$/g, '');
  });
}
/** Riscrive un comunicato o un testo grezzo nello stile della testata, in HTML pulito. */
export async function aiRewriteAction(text: string, mode: 'testata' | 'breve' | 'lungo' | 'semplice' | 'traduci'): Promise<R<string>> {
  const s = await getSettings();
  const instr: Record<typeof mode, string> = { testata: `Riscrivi il testo come articolo di ${s.siteName}: lead con le 5 W, paragrafi brevi, uno o due titoletti H2, niente toni promozionali.`, breve: 'Riduci a una notizia breve di massimo 120 parole mantenendo i fatti essenziali.', lungo: 'Amplia in un articolo strutturato con titoletti H2, mantenendo solo i fatti presenti nel testo (nessuna invenzione).', semplice: 'Riscrivi in italiano semplice, frasi corte, adatto a tutti (livello di leggibilità alto).', traduci: 'Traduci in italiano giornalistico corretto, mantenendo nomi e cifre.' };
  return wrap(() => ask(`${instr[mode]}\nRestituisci solo HTML con <p>, <h2>, <ul>/<li>, <blockquote> (niente <html>/<body>, niente markdown).\n\nTesto:\n${clip(text)}`, { maxTokens: 4000, effort: 'medium' }));
}
export async function aiFactCheckAction(content: string): Promise<R<{ claim: string; note: string; severity: 'info' | 'warn' }[]>> {
  return wrap(() => askJson(`Analizza il testo e segnala fino a 8 punti da verificare prima della pubblicazione: cifre, date, nomi, cariche, citazioni, affermazioni non attribuite. Per ciascuno: "claim" (frase citata), "note" (cosa controllare e perché), "severity" ("warn" se rischioso, altrimenti "info"). Non cercare online, ragiona solo sul testo.\n\nTesto:\n${clip(stripHtml(content))}\n\nJSON: array di oggetti.`, { effort: 'medium' }));
}
export async function aiSocialAction(title: string, excerpt: string, url: string): Promise<R<{ facebook: string; x: string; telegram: string; hashtags: string[] }>> {
  return wrap(() => askJson(`Scrivi i testi per condividere questo articolo: "facebook" (2-3 righe coinvolgenti, con emoji sobrie), "x" (max 240 caratteri), "telegram" (titolo in grassetto markdown + una riga), "hashtags" (3-5 senza #). Non includere l'URL, verrà aggiunto.\nTitolo: ${title}\nSommario: ${excerpt}\nURL: ${url}\nJSON.`));
}

export async function transcribeAction(url: string, mode: 'testo' | 'verbale' | 'articolo'): Promise<R<string>> {
  const me = await getCurrentUser(); if (!me) return { ok: false, message: 'Non autorizzato.' };
  try { const { transcribeUrl, shapeTranscript } = await import('./transcribe'); const text = await transcribeUrl(url); if (!text.trim()) return { ok: false, message: 'Trascrizione vuota: il file non contiene parlato riconoscibile.' }; return { ok: true, data: await shapeTranscript(text, mode) }; }
  catch (e) { return { ok: false, message: (e as Error).message }; }
}
