'use client';
import { useEffect, useState } from 'react';
import { missedAction } from '@/lib/actions-reading';
import { ATTENTION_KEY, type AttentionEntry } from './attention-tracker';

const KEY = 'aster_last_visit';
/** «Ciò che ti sei perso»: compare solo a chi torna dopo almeno sei ore, ordinato secondo le sezioni che legge di più su questo dispositivo. */
export function MissedBox() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof missedAction>>>([]); const [since, setSince] = useState(''); const [closed, setClosed] = useState(false);
  useEffect(() => {
    let last = ''; let fav: string[] = [];
    try { last = localStorage.getItem(KEY) ?? ''; const rows = JSON.parse(localStorage.getItem(ATTENTION_KEY) ?? '[]') as AttentionEntry[]; const by = rows.reduce<Record<string, number>>((m, r) => { m[r.cat] = (m[r.cat] ?? 0) + r.sec; return m; }, {}); fav = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 5); localStorage.setItem(KEY, new Date().toISOString()); } catch { return; }
    if (!last || Date.now() - +new Date(last) < 6 * 3_600_000) return; setSince(last); missedAction(last, fav).then(setItems).catch(() => {});
  }, []);
  if (closed || items.length === 0) return null; const hours = Math.round((Date.now() - +new Date(since)) / 3_600_000);
  return (
    <aside className="missed-box" aria-label="Ciò che ti sei perso"><header><b>Bentornato. In {hours < 48 ? `${hours} ore` : `${Math.round(hours / 24)} giorni`} ti sei perso questo</b><button type="button" aria-label="Chiudi" onClick={() => setClosed(true)}>✕</button></header>
      <ol>{items.map((i) => <li key={i.url}><a href={i.url}>{i.title}</a><span>{i.kicker} · {i.why}</span></li>)}</ol><p className="help">Scelto per te in base a ciò che leggi su questo dispositivo: non lo salviamo da nessuna parte. Preferisci una pagina finita? <a href="/colazione">Modalità colazione</a>.</p></aside>
  );
}
