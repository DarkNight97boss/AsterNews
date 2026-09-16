import 'server-only';
import { aiSettings } from './ai';
import { uploadRaw } from './storage';
import { stripHtml } from './utils';

/** Audio-articolo: voce sintetica (OpenAI TTS o ElevenLabs) salvata nello storage come mp3, usata dal player e dal feed podcast. */
export async function synthesize(text: string): Promise<Buffer> {
  const s = await aiSettings(); const provider = s.ttsProvider ?? 'none'; const key = s.ttsKey ?? '';
  if (provider === 'none' || !key) throw new Error('Voce sintetica non configurata (Impostazioni → Assistente AI → Audio-articolo).');
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, 4000 * 3);
  if (provider === 'elevenlabs') {
    const voice = s.ttsVoice || 'JBFqnCBsd6RMkjVDRZzb';
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: clean.slice(0, 5000), model_id: 'eleven_multilingual_v2' }), signal: AbortSignal.timeout(120_000) });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 120)}`); return Buffer.from(await r.arrayBuffer());
  }
  // OpenAI: massimo 4096 caratteri per richiesta → spezza e concatena gli mp3
  const chunks: string[] = []; let cur = ''; for (const sent of clean.split(/(?<=[.!?])\s+/)) { if ((cur + ' ' + sent).length > 3800) { chunks.push(cur); cur = sent; } else cur = cur ? cur + ' ' + sent : sent; } if (cur) chunks.push(cur);
  const parts: Buffer[] = [];
  for (const c of chunks.slice(0, 6)) { const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: s.ttsVoice || 'alloy', input: c, response_format: 'mp3' }), signal: AbortSignal.timeout(120_000) }); if (!r.ok) throw new Error(`OpenAI TTS ${r.status}: ${(await r.text()).slice(0, 120)}`); parts.push(Buffer.from(await r.arrayBuffer())); }
  return Buffer.concat(parts);
}
export async function audioForArticle(a: { id: string; slug: string; title: string; subtitle: string; content: string }): Promise<{ url: string; duration: number }> {
  const text = `${a.title}. ${a.subtitle ? a.subtitle + '. ' : ''}${stripHtml(a.content)}`;
  const buf = await synthesize(text); const url = await uploadRaw(buf, `audio/${a.slug}-${a.id.slice(-6)}.mp3`, 'audio/mpeg');
  return { url, duration: Math.round(text.split(/\s+/).length / 2.6) };
}
