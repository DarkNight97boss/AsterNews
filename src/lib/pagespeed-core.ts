import type { PageSpeedOpportunity, PageSpeedRun } from './models';

/** Chiamata all'API PageSpeed Insights (Lighthouse di Google) e lettura dei risultati. Nessuna dipendenza dal server: usabile anche dagli script. */
export type PsiStrategy = 'mobile' | 'desktop';
export type PsiResult = Omit<PageSpeedRun, 'id' | 'createdAt'> & { reportUrl: string };

const METRIC_IDS = new Set(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index', 'interactive', 'max-potential-fid', 'first-meaningful-paint']);
const SKIP = new Set(['final-screenshot', 'screenshot-thumbnails', 'main-thread-tasks', 'network-requests', 'network-rtt', 'network-server-latency', 'diagnostics', 'metrics', 'resource-summary', 'script-treemap-data', 'full-page-screenshot', 'largest-contentful-paint-element', 'lcp-breakdown-insight', 'network-dependency-tree-insight', 'third-parties-insight']);

export async function runPageSpeed(url: string, strategy: PsiStrategy, apiKey = ''): Promise<PsiResult> {
  const qs = new URLSearchParams({ url, strategy, locale: 'it' });
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) qs.append('category', c);
  if (apiKey) qs.set('key', apiKey);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${qs}`, { signal: AbortSignal.timeout(120_000), cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `PageSpeed ${res.status}`);
  const lr = json.lighthouseResult; const cat = lr.categories ?? {}; const audits = lr.audits ?? {};
  const score = (k: string) => Math.round(((cat[k]?.score as number) ?? 0) * 100);
  const num = (k: string) => Math.round(((audits[k]?.numericValue as number) ?? 0) * 1000) / 1000;
  const opportunities: PageSpeedOpportunity[] = [];
  for (const [id, a] of Object.entries(audits) as [string, Record<string, unknown>][]) {
    if (METRIC_IDS.has(id) || SKIP.has(id)) continue;
    const mode = String(a.scoreDisplayMode ?? ''); if (mode === 'manual' || mode === 'notApplicable' || mode === 'error') continue;
    const details = (a.details ?? {}) as Record<string, unknown>;
    const savingsKb = Math.round((Number(details.overallSavingsBytes ?? 0) || sumWasted(details)) / 1024);
    const ms = (a.metricSavings ?? {}) as Record<string, number>;
    const savingsMs = Math.round(Number(details.overallSavingsMs ?? 0) || Math.max(0, ...Object.values(ms).map(Number)));
    const failing = typeof a.score === 'number' && a.score < 1;
    if (!failing && savingsKb < 5 && savingsMs < 50) continue;
    const items = ((details.items as Record<string, unknown>[] | undefined) ?? []).slice(0, 6).map(labelOf).filter(Boolean) as string[];
    opportunities.push({ id, title: String(a.title ?? id), displayValue: String(a.displayValue ?? ''), savingsKb, savingsMs, items });
  }
  opportunities.sort((x, y) => (y.savingsMs + y.savingsKb * 4) - (x.savingsMs + x.savingsKb * 4));
  return {
    url, strategy, performance: score('performance'), accessibility: score('accessibility'), bestPractices: score('best-practices'), seo: score('seo'),
    lcp: num('largest-contentful-paint'), cls: num('cumulative-layout-shift'), tbt: num('total-blocking-time'), fcp: num('first-contentful-paint'), si: num('speed-index'),
    opportunities: opportunities.slice(0, 12), reportUrl: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=${strategy}`,
  };
}
function sumWasted(d: Record<string, unknown>): number { const items = (d.items as Record<string, unknown>[] | undefined) ?? []; return items.reduce((n, i) => n + Number(i.wastedBytes ?? 0), 0); }
function labelOf(i: Record<string, unknown>): string {
  const node = i.node as Record<string, unknown> | undefined; const src = i.source as Record<string, unknown> | undefined;
  const url = (i.url as string) ?? (src?.url as string) ?? (i.request as Record<string, unknown> | undefined)?.url as string | undefined;
  const label = url ? shortUrl(url) : node ? String(node.nodeLabel ?? node.selector ?? node.snippet ?? '') : String(i.label ?? i.statistic ?? i.name ?? '');
  const extra = i.wastedBytes ? ` (−${Math.round(Number(i.wastedBytes) / 1024)} KiB)` : i.totalBytes ? ` (${Math.round(Number(i.totalBytes) / 1024)} KiB)` : i.duration ? ` (${Math.round(Number(i.duration))} ms)` : '';
  return label ? label.slice(0, 120) + extra : '';
}
function shortUrl(u: string): string { try { const x = new URL(u); if (x.pathname.startsWith('/_next/image')) { const inner = x.searchParams.get('url') ?? ''; return 'immagine ' + (inner.startsWith('http') ? new URL(inner).pathname.split('/').slice(-2).join('/') : inner).slice(0, 60); } return (x.host + x.pathname).slice(0, 80); } catch { return u.slice(0, 80); } }

/** Cosa fare nel CMS per ogni segnalazione di Lighthouse (in italiano, senza gergo). */
export const AUDIT_ADVICE: Record<string, string> = {
  'image-delivery-insight': 'Immagini più pesanti del necessario. Carica le foto dalla Libreria media (vengono convertite in WebP a più misure) e usa gli slot immagine del tema: il browser scarica solo la larghezza che serve.',
  'uses-responsive-images': 'Immagini più grandi dello spazio in cui compaiono. Le card del tema hanno già le misure automatiche; per le foto nel testo usa la Libreria media.',
  'uses-optimized-images': 'Immagini poco compresse: ricaricale dalla Libreria media, che le ottimizza in upload.',
  'modern-image-formats': 'Formati vecchi (JPEG/PNG): il sito serve WebP e AVIF per le foto della Libreria e per quelle remote passate dall\'ottimizzatore.',
  'lcp-discovery-insight': 'L\'immagine principale deve essere scoperta subito e con priorità alta: gli slot «hero» e «cover» lo fanno da soli. Se hai un template personalizzato controlla che l\'apertura usi quello slot.',
  'prioritize-lcp-image': 'Immagine principale senza priorità: usa lo slot «hero»/«cover» per l\'apertura.',
  'lcp-lazy-loaded': 'L\'immagine principale è in lazy loading: l\'apertura deve usare lo slot «hero»/«cover».',
  'render-blocking-insight': 'Script o fogli di stile che bloccano il primo disegno. Il CSS del sito è già inline: controlla gli script esterni aggiunti (analytics, AdSense, embed) e caricali in modo differito.',
  'render-blocking-resources': 'Risorse bloccanti: di solito script esterni inseriti nelle impostazioni o negli embed.',
  'unused-javascript': 'JavaScript non usato: quasi sempre pubblicità o social esterni. Disattiva le estensioni che non servono.',
  'unused-css-rules': 'CSS non usato: se è del sito è sotto controllo; se viene da script esterni valuta di toglierli.',
  'third-party-summary': 'Terze parti pesanti (AdSense, embed social, mappe). Limita gli embed per articolo e carica la pubblicità a scorrimento.',
  'legacy-javascript-insight': 'Polyfill inclusi dal framework per browser vecchi: nessuna azione necessaria.',
  'legacy-javascript': 'Polyfill del framework: nessuna azione necessaria.',
  'dom-size-insight': 'Pagina con troppi elementi: riduci le sezioni della home (Impostazioni → Generale) o gli articoli per pagina.',
  'dom-size': 'Troppi elementi in pagina: meno sezioni in home o meno articoli per pagina.',
  'font-display-insight': 'Font senza «swap»: i font di Google del tema lo usano già; controlla eventuali font aggiunti a mano.',
  'font-display': 'Font senza «swap»: controlla i font aggiunti a mano.',
  'cls-culprits-insight': 'Spostamenti di layout: immagini nel testo senza dimensioni (le foto della Libreria le hanno) o spazi pubblicitari senza altezza fissa (imposta le dimensioni in Pubblicità).',
  'layout-shift-elements': 'Elementi che si spostano durante il caricamento: immagini senza dimensioni o banner senza altezza.',
  'cache-insight': 'Cache breve su risorse di terze parti: i file del sito sono già immutabili.',
  'uses-long-cache-ttl': 'Cache breve su risorse esterne: nulla da fare per i file del sito.',
  'server-response-time': 'Risposta del server lenta: controlla la cache dati (Impostazioni → Sistema) e la salute del database in «Errori e salute».',
  'document-latency-insight': 'Documento lento o non compresso: verifica cache e database; su Vercel la compressione è automatica.',
  'total-byte-weight': 'Pagina pesante: meno sezioni in home e immagini dalla Libreria media.',
  'long-tasks': 'Attività lunghe nel thread principale: in genere script esterni (pubblicità, analytics).',
  'mainthread-work-breakdown': 'Molto lavoro JavaScript: riduci gli script esterni.',
  'bootup-time': 'Tempo di esecuzione JavaScript alto: riduci gli script esterni.',
  'forced-reflow-insight': 'Reflow forzati da script: quasi sempre widget esterni.',
  'duplicated-javascript-insight': 'JavaScript duplicato: script esterni caricati due volte (es. due tag analytics).',
  'modern-http-insight': 'Risorse servite su HTTP/1: host esterni, nulla da fare lato CMS.',
  'viewport-insight': 'Meta viewport mancante: il tema lo include; controlla eventuali template personalizzati.',
  'network-dependency-tree-insight': 'Catena di richieste critiche: informativo.',
  'unminified-javascript': 'Script non minificati: solo script esterni aggiunti a mano.',
  'unminified-css': 'CSS non minificato: solo fogli di stile esterni aggiunti a mano.',
  'efficient-animated-content': 'GIF animate pesanti: usa video MP4/WebM o immagini statiche.',
  'offscreen-images': 'Immagini fuori schermo caricate subito: le card del tema sono lazy; controlla gli embed.',
  'uses-text-compression': 'Compressione testo assente: su Vercel è automatica; verifica l\'hosting.',
  'redirects': 'Redirect in catena: controlla i redirect in «Redirect e 404».',
  'errors-in-console': 'Errori JavaScript in console: guarda «Errori e salute».',
  'csp-xss': 'CSP contro XSS: una policy stretta bloccherebbe AdSense ed embed; il sito applica frame-ancestors e base-uri.',
  'trusted-types-xss': 'Trusted Types: non applicabile con gli script di terze parti in uso.',
};
export const adviceFor = (id: string): string => AUDIT_ADVICE[id] ?? 'Apri il rapporto completo su PageSpeed per il dettaglio.';
export const scoreColor = (n: number): string => (n >= 90 ? '#0b7a4b' : n >= 50 ? '#e67e00' : '#d7262d');
