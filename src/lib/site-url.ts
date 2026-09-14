/**
 * URL pubblico del sito, sempre valido.
 * Ordine: NEXT_PUBLIC_SITE_URL → dominio di produzione Vercel → URL del deployment → localhost.
 * Ignora valori non leggibili (es. "[SENSITIVE]" scritto da `vercel env pull`) e aggiunge https:// se manca lo schema.
 */
export function siteUrl(): string {
  const candidates = [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL];
  for (const raw of candidates) {
    const v = (raw ?? '').trim();
    if (!v || v.includes('[SENSITIVE]')) continue;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try { return new URL(withScheme).origin; } catch { /* prova il prossimo */ }
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
