import { vitalsSummary } from '@/lib/repo-extra3';
const good: Record<string, [number, number]> = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], TTFB: [800, 1800], FCP: [1800, 3000] };
const fmt = (m: string, v: number) => (m === 'CLS' ? v.toFixed(3) : v >= 1000 ? (v / 1000).toFixed(2).replace('.', ',') + ' s' : Math.round(v) + ' ms');
const color = (m: string, v: number) => (v <= good[m][0] ? '#0b7a4b' : v <= good[m][1] ? '#e67e00' : '#d7262d');
/** Core Web Vitals reali (p75 degli ultimi 7 giorni) per dispositivo e pagine peggiori. */
export async function VitalsPanel() {
  const s = await vitalsSummary(7);
  return (
    <div className="panel"><div className="panel-title">Core Web Vitals reali (p75, ultimi 7 giorni, {s.samples} campioni)</div>
      {s.samples === 0 ? <p className="help">Nessun dato ancora: i valori arrivano dai lettori veri mentre navigano (nessun cookie). Google usa questi, non il laboratorio.</p> : <>
        <div className="admin-grid-2">{(['mobile', 'desktop'] as const).map((d) => <div key={d}><b>{d === 'mobile' ? '📱 Smartphone' : '🖥 Computer'}</b><div className="perf-metrics" style={{ marginTop: 6 }}>{['LCP', 'INP', 'CLS', 'TTFB', 'FCP'].map((m) => { const v = s.p75[d]?.[m]; return v === undefined ? null : <span key={m}>{m} <b style={{ color: color(m, v) }}>{fmt(m, v)}</b></span>; })}</div></div>)}</div>
        {s.worst.length > 0 && <><b style={{ fontSize: 13, display: 'block', marginTop: 12 }}>Pagine con LCP più alto (mobile)</b><table className="table"><tbody>{s.worst.map((w) => <tr key={w.path}><td className="t-title">{w.path}</td><td><b style={{ color: color('LCP', w.value) }}>{fmt('LCP', w.value)}</b></td><td className="help">{w.n} campioni</td></tr>)}</tbody></table></>}
      </>}
    </div>
  );
}
