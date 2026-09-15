import 'server-only';
import { unstable_cache } from 'next/cache';

/**
 * Cache dei dati con etichette (tag): le pagine restano dinamiche (cookie, tema, utente) ma le query pesanti
 * vengono servite dalla cache di Next per `seconds` secondi e invalidate subito quando la redazione salva qualcosa.
 * Tag usati: 'articles' (articoli, commenti), 'taxonomy' (categorie, tag, zone, utenti), 'settings', 'events'.
 */
export const CACHE_TAGS = { articles: 'articles', taxonomy: 'taxonomy', settings: 'settings', events: 'events' } as const;
type G = typeof globalThis & { __asterCacheSeconds?: number };
export function setCacheSeconds(v: number): void { (globalThis as G).__asterCacheSeconds = v; }
export function cacheSeconds(): number { return (globalThis as G).__asterCacheSeconds ?? 60; }

export function cached<A extends unknown[], R>(key: string, fn: (...args: A) => Promise<R>, tags: string[]): (...args: A) => Promise<R> {
  return (...args: A) => {
    const secs = cacheSeconds();
    if (secs <= 0) return fn(...args);
    return unstable_cache(fn, [key], { tags, revalidate: secs })(...args);
  };
}
