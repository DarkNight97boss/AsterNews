'use client';

import { useState, useTransition } from 'react';
import { competitorTitlesAction, languagesAction, linkTargetsAction, setTitleBAction, translateArticleAction, trendsAction } from '@/lib/actions-seo';
import type { Article } from '@/lib/models';
import { toast } from '@/components/ui/toaster';
import { useEffect } from 'react';

type Item = { title: string; link: string; source: string; date: string; extra?: string };
/** Tendenze Google, titoli della concorrenza, link interni a tag/dossier/eventi, test A/B del titolo, traduzioni. */
export function SeoIntel({ article: a, isNew, onInsertLink, onTitleB }: { article: Article; isNew: boolean; onInsertLink: (url: string, label: string) => void; onTitleB: (t: string) => void }) {
  const [trends, setTrends] = useState<{ trends: Item[]; matches: Item[] } | null>(null); const [comp, setComp] = useState<Item[]>([]); const [q, setQ] = useState(''); const [links, setLinks] = useState<{ label: string; url: string; kind: string }[]>([]); const [lq, setLq] = useState('');
  const [titleB, setTitleB] = useState(a.extra?.titleB ?? ''); const [langs, setLangs] = useState<string[]>([]); const [pending, start] = useTransition();
  useEffect(() => { languagesAction().then(setLangs).catch(() => {}); }, []);
  const st = a.extra?.abStats;
  return (
    <div className="panel"><div className="panel-title">SEO avanzata</div>
      <div className="intel-row"><button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await trendsAction(`${a.title} ${a.kicker} ${a.excerpt}`); if (r.ok && r.data) setTrends(r.data); else toast.error(r.message ?? ''); })}>📈 Tendenze Google Italia</button></div>
      {trends && <div className="intel-box">{trends.matches.length > 0 && <p className="ok-text">🔥 In tendenza adesso: {trends.matches.map((m) => m.title).join(', ')}</p>}<div className="chips">{trends.trends.slice(0, 15).map((t) => <span key={t.title} className="chip" title={t.extra}>{t.title}</span>)}</div></div>}
      <div className="intel-row"><input className="input" placeholder="Chi titola così? parola chiave…" value={q} onChange={(e) => setQ(e.target.value)} /><button type="button" className="btn btn-outline btn-sm" disabled={pending || !q} onClick={() => start(async () => { const r = await competitorTitlesAction(q); if (r.ok && r.data) setComp(r.data); else toast.error(r.message ?? ''); })}>Cerca</button></div>
      {comp.length > 0 && <ul className="intel-list">{comp.map((c, i) => <li key={i}><a href={c.link} target="_blank" rel="noreferrer">{c.title}</a> <span className="help">{c.source}</span></li>)}</ul>}
      <div className="intel-row"><input className="input" placeholder="Link interno a tag, dossier, evento, zona…" value={lq} onChange={(e) => { setLq(e.target.value); if (e.target.value.length >= 2) linkTargetsAction(e.target.value).then(setLinks); else setLinks([]); }} /></div>
      {links.length > 0 && <ul className="intel-list">{links.map((l) => <li key={l.url}><button type="button" className="link-btn" onClick={() => { onInsertLink(l.url, l.label); setLinks([]); setLq(''); }}>{l.label}</button> <span className="help">{l.kind} · {l.url}</span></li>)}</ul>}
      {!isNew && <>
        <div className="field" style={{ marginTop: 10 }}><label>Titolo alternativo per il test A/B in home</label><div style={{ display: 'flex', gap: 6 }}><input className="input" value={titleB} onChange={(e) => { setTitleB(e.target.value); onTitleB(e.target.value); }} placeholder="Seconda versione del titolo" /><button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await setTitleBAction(a.id, titleB); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Avvia</button></div>
          {st && <div className="help">A: {st.a} viste, {st.ca} clic ({st.a ? ((st.ca / st.a) * 100).toFixed(1) : 0}%) · B: {st.b} viste, {st.cb} clic ({st.b ? ((st.cb / st.b) * 100).toFixed(1) : 0}%){st.winner ? ` · vincitore: ${st.winner.toUpperCase()} (applicato)` : ' · vincitore dopo 200 viste per variante'}</div>}
        </div>
        {langs.length > 0 && <div className="field"><label>Traduzioni (bozza con l&apos;assistente AI, hreflang automatico)</label><div className="chips">{langs.map((l) => a.extra?.translations?.[l] ? <a key={l} className="chip" href={`/admin/articoli/${a.extra.translations[l]}`}>✔ {l.toUpperCase()}</a> : <button key={l} type="button" className="chip chip-btn" disabled={pending} onClick={() => start(async () => { const r = await translateArticleAction(a.id, l); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>+ {l.toUpperCase()}</button>)}</div></div>}
      </>}
    </div>
  );
}
