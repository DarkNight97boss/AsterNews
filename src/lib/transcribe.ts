import 'server-only';
import { ask, aiAvailable, aiSettings, clip } from './ai';

/** Trascrizione di audio e video con provider esterno (OpenAI Whisper o Deepgram) e sintesi con l'assistente AI. */
export async function transcribeUrl(url: string): Promise<string> {
  const s = await aiSettings(); const provider = s.transcribeProvider ?? 'none'; const key = s.transcribeKey ?? '';
  if (provider === 'none' || !key) throw new Error('Trascrizione non configurata: scegli un provider (OpenAI o Deepgram) in Impostazioni → Assistente AI.');
  if (!/^https?:\/\//.test(url)) throw new Error('Serve l\'indirizzo pubblico del file audio o video (mp3, m4a, mp4, wav…).');
  if (provider === 'deepgram') {
    const r = await fetch('https://api.deepgram.com/v1/listen?language=it&model=nova-2&smart_format=true&paragraphs=true&punctuate=true', { method: 'POST', headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(280_000) });
    const j = await r.json(); if (!r.ok) throw new Error(j.err_msg ?? j.error ?? `Deepgram ${r.status}`);
    const alt = j.results?.channels?.[0]?.alternatives?.[0]; return alt?.paragraphs?.transcript ?? alt?.transcript ?? '';
  }
  const file = await fetch(url, { signal: AbortSignal.timeout(60_000) }); if (!file.ok) throw new Error(`File non scaricabile (${file.status})`);
  const blob = await file.blob(); if (blob.size > 25 * 1024 * 1024) throw new Error('OpenAI accetta file fino a 25 MB: comprimi l\'audio o usa Deepgram.');
  const fd = new FormData(); fd.append('file', blob, url.split('/').pop()?.split('?')[0] || 'audio.mp3'); fd.append('model', 'whisper-1'); fd.append('language', 'it'); fd.append('response_format', 'text');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd, signal: AbortSignal.timeout(280_000) });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.text();
}
/** Trascrizione grezza → testo pulito, verbale (conferenze stampa, consigli comunali) o bozza di articolo. */
export async function shapeTranscript(text: string, mode: 'testo' | 'verbale' | 'articolo'): Promise<string> {
  if (mode === 'testo' || !(await aiAvailable())) return text.split(/\n{2,}/).map((p) => `<p>${p.trim()}</p>`).join('\n');
  const prompt = mode === 'verbale'
    ? `Questa è la trascrizione automatica di una conferenza stampa o di una seduta pubblica. Produci in italiano un verbale in HTML (solo <h2>, <p>, <ul>, <li>, <b>): 1) <h2>In sintesi</h2> 3-5 punti; 2) <h2>Gli interventi</h2> per ogni parlante riconoscibile i passaggi chiave con virgolettati fedeli; 3) <h2>Decisioni e numeri</h2> date, cifre, delibere; 4) <h2>Da verificare</h2> passaggi ambigui. Non inventare nulla.\n\nTRASCRIZIONE:\n${clip(text, 60000)}`
    : `Dalla trascrizione seguente scrivi una bozza di articolo giornalistico in italiano, in HTML (solo <p>, <h2>, <b>): attacco con la notizia principale, poi i passaggi rilevanti con virgolettati fedeli (mai inventati), chiusura con i prossimi passi. 400-700 parole.\n\nTRASCRIZIONE:\n${clip(text, 60000)}`;
  return ask(prompt, { maxTokens: 4000, effort: 'medium' });
}
