/**
 * URL pubblico del sito, sempre valido.
 * Ordine: NEXT_PUBLIC_SITE_URL → dominio di produzione Vercel → URL del deployment → localhost.
 * Ignora valori non leggibili (es. "[SENSITIVE]" scritto da `vercel env pull`) e aggiunge https:// se manca lo schema.
 */
type G = typeof globalThis & { __asterSiteUrl?: string };
/** L'installazione guidata può salvare l'indirizzo nel database (meta.site_url): vince sulle variabili d'ambiente. */
export function setSiteUrlOverride(url: string | null): void { (globalThis as G).__asterSiteUrl = url ?? undefined; }
export function siteUrl(): string {
  const candidates = [(globalThis as G).__asterSiteUrl, process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL];
  for (const raw of candidates) {
    const v = (raw ?? '').trim();
    if (!v || v.includes('[SENSITIVE]')) continue;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try { return new URL(withScheme).origin; } catch { /* prova il prossimo */ }
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
