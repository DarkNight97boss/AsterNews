import 'server-only';
import { aiAvailable, aiSettings, askJson, clip } from './ai';

/** Moderazione assistita: Claude valuta tossicità e spam; il punteggio ordina la coda e sposta automaticamente i casi evidenti. */
export async function moderateComment(body: string, context: string): Promise<{ score: number; note: string; verdict: 'ok' | 'review' | 'spam' } | null> {
  const s = await aiSettings(); if (!s.moderation || !(await aiAvailable())) return null;
  try {
    const r = await askJson<{ toxicity: number; spam: number; reason: string }>(`Valuta questo commento di un lettore a un articolo di cronaca locale italiana. Rispondi SOLO con JSON {"toxicity": 0-1, "spam": 0-1, "reason": "breve motivo in italiano"}. Tossicità = insulti, minacce, odio, dati personali di terzi, diffamazione. Spam = pubblicità, link sospetti, testo senza senso.\n\nARTICOLO: ${clip(context, 600)}\nCOMMENTO: ${clip(body, 2000)}`, { maxTokens: 200, effort: 'low' });
    const score = Math.max(Number(r.toxicity) || 0, Number(r.spam) || 0);
    return { score, note: String(r.reason ?? '').slice(0, 200), verdict: (Number(r.spam) || 0) >= 0.85 ? 'spam' : score >= 0.6 ? 'review' : 'ok' };
  } catch { return null; }
}
