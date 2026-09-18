import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_AI, AiSettings } from './models';
import { getSettings } from './queries';

/** Impostazioni AI: dal pannello, con ANTHROPIC_API_KEY dall'ambiente come ripiego. */
export async function aiSettings(): Promise<AiSettings> {
  const s = { ...DEFAULT_AI, ...((await getSettings()).ai ?? {}) };
  if (!s.apiKey && process.env.ANTHROPIC_API_KEY) s.apiKey = process.env.ANTHROPIC_API_KEY;
  if (!s.model) s.model = DEFAULT_AI.model;
  return s;
}
export async function aiAvailable(): Promise<boolean> { const s = await aiSettings(); return s.enabled && !!s.apiKey; }

const SYSTEM_BASE = `Sei l'assistente redazionale di una testata giornalistica italiana. Rispondi sempre in italiano, senza preamboli né spiegazioni: restituisci solo il risultato richiesto. Non inventare fatti, nomi o cifre che non siano nel testo fornito.`;

/** Una richiesta a Claude: testo semplice o JSON (validato) secondo lo schema indicato. Il "fallback" di sicurezza lato server è attivo di default. */
export async function ask(prompt: string, opts: { json?: boolean; maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {}): Promise<string> {
  const s = await aiSettings();
  if (!s.enabled || !s.apiKey) throw new Error('Assistente AI non configurato (Impostazioni → Assistente AI).');
  const client = new Anthropic({ apiKey: s.apiKey });
  const system = `${SYSTEM_BASE}\nStile della testata: ${s.style}${opts.json ? '\nRispondi esclusivamente con JSON valido, senza testo attorno e senza blocchi di codice.' : ''}`;
  const res = await client.beta.messages.create({
    model: s.model, max_tokens: opts.maxTokens ?? 2048, system,
    betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    thinking: { type: 'adaptive' }, output_config: { effort: opts.effort ?? 'low' },
    messages: [{ role: 'user', content: prompt }],
  });
  if (res.stop_reason === 'refusal') throw new Error('La richiesta è stata rifiutata dal modello.');
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim();
  return opts.json ? text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim() : text;
}
/** Come ask(), ma con lo strumento di ricerca web di Claude: usato dalla verifica fatti per collegare fonti. */
export async function askWithSearch(prompt: string, opts: { maxTokens?: number; maxUses?: number } = {}): Promise<string> {
  const s = await aiSettings(); if (!s.enabled || !s.apiKey) throw new Error('Assistente AI non configurato.');
  const client = new Anthropic({ apiKey: s.apiKey });
  const res = await client.beta.messages.create({ model: s.model, max_tokens: opts.maxTokens ?? 3000, system: `${SYSTEM_BASE}\nRispondi esclusivamente con JSON valido, senza testo attorno e senza blocchi di codice.`, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default', thinking: { type: 'adaptive' }, output_config: { effort: 'medium' }, tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: opts.maxUses ?? 6 } as never], messages: [{ role: 'user', content: prompt }] });
  return res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
}
export async function askJson<T>(prompt: string, opts: { maxTokens?: number; effort?: 'low' | 'medium' | 'high' } = {}): Promise<T> {
  const raw = await ask(prompt, { ...opts, json: true });
  try { return JSON.parse(raw) as T; } catch { const m = raw.match(/[[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]) as T; throw new Error('Risposta AI non interpretabile.'); }
}
export const clip = (s: string, n = 12000): string => (s.length > n ? s.slice(0, n) + '…' : s);
