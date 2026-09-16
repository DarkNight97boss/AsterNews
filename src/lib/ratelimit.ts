import 'server-only';
import { headers } from 'next/headers';

/**
 * Limitatore di frequenza in memoria (per istanza): finestra scorrevole per chiave (es. IP + azione).
 * Protegge login, commenti, iscrizioni, annunci e API pubblica dagli abusi senza servizi esterni.
 */
type G = typeof globalThis & { __asterRl?: Map<string, number[]> };
const store = ((globalThis as G).__asterRl ??= new Map<string, number[]>());

export function checkLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now(); const list = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) { store.set(key, list); return { ok: false, retryAfter: Math.ceil((windowMs - (now - list[0])) / 1000) }; }
  list.push(now); store.set(key, list);
  if (store.size > 5000) { for (const [k, v] of store) if (!v.some((t) => now - t < windowMs)) store.delete(k); }
  return { ok: true, retryAfter: 0 };
}
export async function ipKey(action: string): Promise<string> {
  try { const h = await headers(); const ip = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? 'local').split(',')[0].trim(); return `${action}:${ip}`; } catch { return `${action}:local`; }
}
/** Da usare nelle server action: lancia un messaggio in italiano se il limite è superato. */
export async function guardRate(action: string, max: number, windowMs = 60_000): Promise<string | null> {
  const r = checkLimit(await ipKey(action), max, windowMs);
  return r.ok ? null : `Troppe richieste: riprova tra ${r.retryAfter} secondi.`;
}
