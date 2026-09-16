/** Grafici a barre e a linee come SVG statico: nessuna libreria, nessun JavaScript lato lettore, accessibili (title + tabella dati nascosta). */
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

export function chartSvg(kind: 'bar' | 'line', labels: string[], values: number[], title = '', color = '#22418f'): string {
  const W = 720, H = 360, padL = 56, padR = 20, padT = title ? 44 : 20, padB = 56;
  const max = Math.max(1, ...values); const min = Math.min(0, ...values); const range = max - min || 1;
  const iw = W - padL - padR, ih = H - padT - padB; const n = Math.max(1, values.length);
  const y = (v: number) => padT + ih - ((v - min) / range) * ih;
  const ticks = 4; const grid = Array.from({ length: ticks + 1 }, (_, i) => min + (range * i) / ticks);
  let body = grid.map((g) => `<line x1="${padL}" x2="${W - padR}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="#e5e5e5"/><text x="${padL - 8}" y="${(y(g) + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="#666">${fmt(g)}</text>`).join('');
  if (kind === 'bar') {
    const bw = iw / n; const barW = Math.max(6, bw * 0.62);
    body += values.map((v, i) => { const x = padL + i * bw + (bw - barW) / 2; return `<rect x="${x.toFixed(1)}" y="${y(Math.max(v, 0)).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.abs(y(v) - y(0)).toFixed(1)}" fill="${color}" rx="3"><title>${esc(labels[i] ?? '')}: ${fmt(v)}</title></rect><text x="${(x + barW / 2).toFixed(1)}" y="${(y(Math.max(v, 0)) - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#222">${fmt(v)}</text>`; }).join('');
    body += labels.map((l, i) => `<text x="${(padL + i * bw + bw / 2).toFixed(1)}" y="${H - padB + 18}" text-anchor="middle" font-size="12" fill="#444">${esc(l.slice(0, 14))}</text>`).join('');
  } else {
    const step = n > 1 ? iw / (n - 1) : 0; const pts = values.map((v, i) => `${(padL + i * step).toFixed(1)},${y(v).toFixed(1)}`);
    body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>` + values.map((v, i) => `<circle cx="${(padL + i * step).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4" fill="${color}"><title>${esc(labels[i] ?? '')}: ${fmt(v)}</title></circle>`).join('');
    body += labels.map((l, i) => `<text x="${(padL + i * step).toFixed(1)}" y="${H - padB + 18}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" font-size="12" fill="#444">${esc(l.slice(0, 14))}</text>`).join('');
  }
  const table = `<table class="chart-data"><caption>${esc(title)}</caption><tbody>${labels.map((l, i) => `<tr><th>${esc(l)}</th><td>${fmt(values[i] ?? 0)}</td></tr>`).join('')}</tbody></table>`;
  return `<figure class="chart-block" data-kind="${kind}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title || 'Grafico')}" xmlns="http://www.w3.org/2000/svg" font-family="system-ui, sans-serif">${title ? `<text x="${padL}" y="24" font-size="16" font-weight="700" fill="#111">${esc(title)}</text>` : ''}${body}</svg>${table}</figure>`;
}
/** "Etichetta, valore" per riga → dati del grafico. */
export function parseChartData(text: string): { labels: string[]; values: number[] } {
  const labels: string[] = []; const values: number[] = [];
  for (const line of text.split(/\n/)) { const m = line.trim().match(/^(.+?)\s*[,;\t|:]\s*(-?\d[\d.]*(?:,\d+)?)\s*%?$/); if (!m) continue; labels.push(m[1].trim()); values.push(Number(m[2].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))); }
  return { labels, values };
}
export function csvToTable(csv: string): string {
  const sep = csv.includes('\t') ? '\t' : csv.split('\n')[0]?.includes(';') ? ';' : ',';
  const rows = csv.trim().split(/\r?\n/).map((r) => r.split(sep).map((c) => esc(c.trim().replace(/^"|"$/g, ''))));
  if (!rows.length) return '';
  return `<table><thead><tr>${rows[0].map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
