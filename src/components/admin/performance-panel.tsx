'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { runPageSpeedAction, savePerformanceSettingsAction } from '@/lib/actions-system';
import type { PageSpeedRun, PerformanceSettings } from '@/lib/models';
import { adviceFor, scoreColor } from '@/lib/pagespeed-core';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const ms = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.', ',') + ' s' : Math.round(n) + ' ms');
const short = (u: string) => { try { const x = new URL(u); return x.pathname === '/' ? 'Home' : decodeURIComponent(x.pathname); } catch { return u; } };

/** Pannello Prestazioni: misurazioni PageSpeed per pagina, cosa fare nel CMS, storico e impostazioni. */
export function PerformancePanel({ runs, settings, hasKey, pages }: { runs: PageSpeedRun[]; settings: PerformanceSettings; hasKey: boolean; pages: string[] }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [cfg, setCfg] = useState(settings); const [keyEdited, setKeyEdited] = useState(false);
  const latest = new Map<string, PageSpeedRun>(); for (const r of runs) { const k = r.url + '|' + r.strategy; if (!latest.has(k)) latest.set(k, r); }
  const prevOf = (r: PageSpeedRun) => runs.find((x) => x.url === r.url && x.strategy === r.strategy && x.createdAt < r.createdAt);
  const urls = [...new Set([...latest.values()].map((r) => r.url))];
  const Ring = ({ n, label }: { n: number; label: string }) => <div style={{ textAlign: 'center' }}><div className="seo-ring" style={{ ['--p' as string]: `${n}%`, ['--c' as string]: scoreColor(n) }}><span>{n}</span></div><div className="help">{label}</div></div>;
  return (
    <>
      <div className="page-title"><div><h1>Prestazioni</h1><p>Misurazioni PageSpeed Insights (Lighthouse) su {pages.length} pagine, {cfg.frequency === 'off' ? 'solo su richiesta' : cfg.frequency === 'daily' ? 'ogni giorno' : 'ogni lunedì'}. Le immagini del sito si ridimensionano da sole: qui vedi se qualcosa peggiora e cosa fare.</p></div><div className="actions"><button className="btn btn-primary" disabled={pending || !hasKey} onClick={() => start(async () => { const r = await runPageSpeedAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>{pending ? 'Misuro… (1-2 minuti)' : '▶ Misura ora'}</button></div></div>
      {!hasKey && <div className="lock-banner">Serve una chiave API gratuita di PageSpeed Insights: su <a href="https://developers.google.com/speed/docs/insights/v5/get-started" target="_blank" rel="noreferrer">Google Cloud</a> crea una chiave per l&apos;API «PageSpeed Insights» e incollala qui sotto (oppure nella variabile d&apos;ambiente <code>PAGESPEED_API_KEY</code>).</div>}
      {urls.length === 0 && hasKey && <div className="panel"><p className="help">Nessuna misurazione ancora: premi «Misura ora».</p></div>}
      {urls.map((u) => (
        <div className="panel" key={u}><div className="panel-title">{short(u)} <a className="btn btn-ghost btn-sm" href={u} target="_blank" rel="noreferrer">apri ↗</a></div>
          <div className="admin-grid-2">
            {(['mobile', 'desktop'] as const).map((st) => { const r = latest.get(u + '|' + st); if (!r) return null; const p = prevOf(r); return (
              <div key={st}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><b>{st === 'mobile' ? '📱 Smartphone' : '🖥 Computer'}</b><span className="help">{formatDate(r.createdAt)}{p && <> · prima {p.performance}{r.performance - p.performance !== 0 && <span style={{ color: r.performance >= p.performance ? '#0b7a4b' : '#d7262d', fontWeight: 700 }}> {r.performance > p.performance ? '▲' : '▼'} {Math.abs(r.performance - p.performance)}</span>}</>}</span></div>
                <div style={{ display: 'flex', gap: 18, margin: '10px 0' }}><Ring n={r.performance} label="Prestazioni" /><Ring n={r.accessibility} label="Accessibilità" /><Ring n={r.bestPractices} label="Best practice" /><Ring n={r.seo} label="SEO" /></div>
                <div className="perf-metrics"><span>LCP <b style={{ color: r.lcp <= 2500 ? '#0b7a4b' : r.lcp <= 4000 ? '#e67e00' : '#d7262d' }}>{ms(r.lcp)}</b></span><span>CLS <b style={{ color: r.cls <= 0.1 ? '#0b7a4b' : r.cls <= 0.25 ? '#e67e00' : '#d7262d' }}>{r.cls.toFixed(3)}</b></span><span>TBT <b style={{ color: r.tbt <= 200 ? '#0b7a4b' : r.tbt <= 600 ? '#e67e00' : '#d7262d' }}>{ms(r.tbt)}</b></span><span>FCP <b>{ms(r.fcp)}</b></span><span>Speed Index <b>{ms(r.si)}</b></span></div>
                {r.opportunities.length > 0 && <details className="perf-opps" open={r.performance < 90}><summary>{r.opportunities.length} segnalazioni · cosa fare</summary><ul className="activity">{r.opportunities.map((o) => <li key={o.id}><span>{o.savingsMs >= 300 || o.savingsKb >= 100 ? '🔴' : o.savingsMs >= 100 || o.savingsKb >= 30 ? '🟠' : '🟡'}</span><div><b>{o.title}</b> {o.displayValue && <span className="help">· {o.displayValue}</span>}{(o.savingsKb > 0 || o.savingsMs > 0) && <span className="help"> · risparmio {o.savingsKb > 0 ? `${o.savingsKb} KiB` : ''}{o.savingsKb > 0 && o.savingsMs > 0 ? ', ' : ''}{o.savingsMs > 0 ? `${o.savingsMs} ms` : ''}</span>}<div style={{ fontSize: 13, marginTop: 2 }}>{adviceFor(o.id)}</div>{o.items.length > 0 && <div className="help" style={{ marginTop: 2 }}>{o.items.slice(0, 4).join(' · ')}</div>}</div></li>)}</ul></details>}
                {r.opportunities.length === 0 && <p className="help">Nessuna segnalazione: tutto ottimizzato.</p>}
              </div>); })}
          </div>
        </div>
      ))}
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Impostazioni</div>
          <div className="field"><label>Chiave API PageSpeed Insights</label><input className="input" type="password" value={cfg.psiApiKey} onChange={(e) => { setCfg({ ...cfg, psiApiKey: e.target.value }); setKeyEdited(true); }} placeholder="AIza…" /><div className="help">Gratuita, 25.000 richieste al giorno. Lasciata vuota, usa la variabile d&apos;ambiente.</div></div>
          <div className="form-row"><div className="field"><label>Frequenza</label><select className="select" value={cfg.frequency} onChange={(e) => setCfg({ ...cfg, frequency: e.target.value as PerformanceSettings['frequency'] })}><option value="weekly">Ogni lunedì</option><option value="daily">Ogni giorno</option><option value="off">Solo a mano</option></select></div><div className="field"><label>Soglia di avviso (prestazioni)</label><input className="input" type="number" min={0} max={100} value={cfg.threshold} onChange={(e) => setCfg({ ...cfg, threshold: Number(e.target.value) })} /></div></div>
          <div className="field"><label>Pagine da misurare (una per riga; vuoto = home, ultimo articolo, prima categoria)</label><textarea className="textarea" style={{ minHeight: 70 }} value={cfg.pages} onChange={(e) => setCfg({ ...cfg, pages: e.target.value })} placeholder={'/\n/cronaca\n/eventi'} /></div>
          <label className="switch"><input type="checkbox" checked={cfg.desktop} onChange={(e) => setCfg({ ...cfg, desktop: e.target.checked })} /> Misura anche da computer</label><br />
          <label className="switch" style={{ marginTop: 6 }}><input type="checkbox" checked={cfg.alerts} onChange={(e) => setCfg({ ...cfg, alerts: e.target.checked })} /> Avvisa (notifica, email e webhook di «Errori e salute») se scende sotto la soglia o perde 10 punti</label>
          <div style={{ marginTop: 12 }}><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await savePerformanceSettingsAction({ ...cfg, psiApiKey: keyEdited ? cfg.psiApiKey : (settings.psiApiKey.startsWith('••••') ? '__keep__' : cfg.psiApiKey) }); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva</button></div>
        </div>
        <div className="panel"><div className="panel-title">Come funziona l&apos;ottimizzazione automatica</div>
          <ul className="activity">
            <li><span>🖼</span><div><b>Misure automatiche.</b> Ogni posizione del sito (apertura, card, miniature, foto nel testo) dichiara la sua larghezza reale: il browser scarica solo la variante che serve, sugli smartphone anche con <code>sizes=&quot;auto&quot;</code>.</div></li>
            <li><span>⚡</span><div><b>Priorità all&apos;immagine principale.</b> L&apos;apertura è precaricata con priorità alta, tutto il resto è lazy.</div></li>
            <li><span>📦</span><div><b>Upload ottimizzato.</b> Le foto caricate nella Libreria diventano WebP in 5 misure (360–1600 px); nel testo ricevono srcset, dimensioni e lazy loading da sole.</div></li>
            <li><span>🧪</span><div><b>Controllo continuo.</b> PageSpeed misura le pagine chiave; se il punteggio scende arriva un avviso con l&apos;azione da fare nel CMS.</div></li>
            <li><span>💻</span><div><b>Da terminale o CI:</b> <code>npm run pagespeed -- --url https://tuosito.it --min 90</code> (fallisce sotto la soglia, utile in GitHub Actions).</div></li>
          </ul>
        </div>
      </div>
      {runs.length > 0 && <div className="panel"><div className="panel-title">Storico</div><div className="table-wrap" style={{ border: 0 }}><table className="table"><thead><tr><th>Quando</th><th>Pagina</th><th>Dispositivo</th><th>Prestazioni</th><th>Accessibilità</th><th>Best practice</th><th>SEO</th><th>LCP</th><th>CLS</th></tr></thead><tbody>{runs.slice(0, 40).map((r) => <tr key={r.id}><td className="help" style={{ whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td><td>{short(r.url)}</td><td>{r.strategy === 'mobile' ? '📱' : '🖥'}</td><td><b style={{ color: scoreColor(r.performance) }}>{r.performance}</b></td><td>{r.accessibility}</td><td>{r.bestPractices}</td><td>{r.seo}</td><td>{ms(r.lcp)}</td><td>{r.cls.toFixed(3)}</td></tr>)}</tbody></table></div></div>}
    </>
  );
}
