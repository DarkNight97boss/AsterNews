/**
 * Misura le pagine con PageSpeed Insights da terminale o in CI.
 *   npm run pagespeed -- --url https://asternewscms.vercel.app --min 90 [--pages /,/cronaca] [--desktop] [--key AIza…]
 * Chiave API: --key oppure PAGESPEED_API_KEY. Esce con codice 1 se una pagina è sotto --min (prestazioni mobile).
 */
import { runPageSpeed, adviceFor } from '../src/lib/pagespeed-core';

const args = new Map<string, string>(); const flags = new Set<string>();
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (!a.startsWith('--')) continue; const next = process.argv[i + 1]; if (next && !next.startsWith('--')) { args.set(a.slice(2), next); i++; } else flags.add(a.slice(2)); }
const base = (args.get('url') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100').replace(/\/$/, '');
const min = Number(args.get('min') ?? 0); const key = args.get('key') ?? process.env.PAGESPEED_API_KEY ?? '';
const pages = (args.get('pages') ?? '/').split(',').map((p) => p.trim()).filter(Boolean);
const strategies = flags.has('desktop') ? ['mobile', 'desktop'] as const : ['mobile'] as const;
if (!key) console.warn('⚠ Nessuna chiave API (PAGESPEED_API_KEY): Google può rifiutare le richieste anonime.');
let failed = false;
for (const p of pages) for (const st of strategies) {
  const url = p.startsWith('http') ? p : base + p; process.stdout.write(`\n${st === 'mobile' ? '📱' : '🖥'} ${url} … `);
  try {
    const r = await runPageSpeed(url, st, key);
    console.log(`prestazioni ${r.performance} · accessibilità ${r.accessibility} · best practice ${r.bestPractices} · SEO ${r.seo} · LCP ${(r.lcp / 1000).toFixed(1)}s · CLS ${r.cls.toFixed(3)} · TBT ${Math.round(r.tbt)}ms`);
    for (const o of r.opportunities.slice(0, 6)) console.log(`   - ${o.title}${o.displayValue ? ` (${o.displayValue})` : ''}\n     → ${adviceFor(o.id)}`);
    if (st === 'mobile' && min && r.performance < min) { failed = true; console.log(`   ✖ sotto la soglia ${min}`); }
  } catch (e) { console.log('errore: ' + (e as Error).message); failed = failed || min > 0; }
}
process.exit(failed ? 1 : 0);
