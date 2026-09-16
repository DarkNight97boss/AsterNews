'use client';

import { useState, useTransition } from 'react';
import { searchConsoleAction } from '@/lib/actions-seo';

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
/** Search Console e Discover nel cruscotto: query, pagine, clic e impressioni degli ultimi 28 giorni. */
export function SearchConsolePanel({ configured }: { configured: boolean }) {
  const [kind, setKind] = useState<'query' | 'page'>('query'); const [type, setType] = useState<'web' | 'discover' | 'news'>('web'); const [rows, setRows] = useState<Row[] | null>(null); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  const load = (k = kind, t = type) => start(async () => { const r = await searchConsoleAction(k, t); if (r.ok && r.data) { setRows(r.data); setErr(''); } else setErr(r.message ?? 'Errore'); });
  return (
    <div className="panel"><div className="panel-title">Google Search Console {configured ? <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => load()}>{rows ? 'Aggiorna' : 'Carica'}</button> : <span className="help">non configurata</span>}</div>
      {!configured && <p className="help">Incolla il JSON dell&apos;account di servizio Google (con accesso in lettura alla proprietà) e l&apos;URL della proprietà in Impostazioni → SEO per vedere qui query, clic, impressioni e le pagine premiate da Discover.</p>}
      {configured && <div className="filters"><select className="select" value={kind} onChange={(e) => { setKind(e.target.value as 'query' | 'page'); load(e.target.value as 'query' | 'page', type); }}><option value="query">Query di ricerca</option><option value="page">Pagine</option></select><select className="select" value={type} onChange={(e) => { setType(e.target.value as 'web' | 'discover' | 'news'); load(kind, e.target.value as 'web' | 'discover' | 'news'); }}><option value="web">Ricerca web</option><option value="discover">Discover</option><option value="news">Google News</option></select></div>}
      {err && <p className="error-text">{err}</p>}
      {rows && <table className="table"><thead><tr><th>{kind === 'query' ? 'Query' : 'Pagina'}</th><th>Clic</th><th>Impressioni</th><th>CTR</th><th>Posizione</th></tr></thead><tbody>{rows.map((r) => <tr key={r.keys[0]}><td className="t-title">{kind === 'page' ? r.keys[0].replace(/^https?:\/\/[^/]+/, '') : r.keys[0]}</td><td>{r.clicks}</td><td>{r.impressions}</td><td>{(r.ctr * 100).toFixed(1)}%</td><td>{r.position.toFixed(1)}</td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="help">Nessun dato nel periodo.</td></tr>}</tbody></table>}
    </div>
  );
}
