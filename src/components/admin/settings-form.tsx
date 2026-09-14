'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { exportJsonAction, resetDemoAction, saveSettingsAction } from '@/lib/actions';
import { Category, SiteSettings } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function SettingsForm({ initial, categories }: { initial: SiteSettings; categories: Category[] }) {
  const router = useRouter();
  const [s, setS] = useState<SiteSettings>(initial);
  const [pending, start] = useTransition();
  const cat = (id: string) => categories.find((c) => c.id === id);
  const move = (i: number, d: number) => { const l = [...s.homeSections]; const j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; setS({ ...s, homeSections: l }); };
  return (
    <>
      <div className="page-title"><div><h1>Impostazioni</h1><p>Configurazione generale del sito.</p></div><div className="actions"><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveSettingsAction(s); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva impostazioni</button></div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Identità</div>
            <div className="form-row"><div className="field"><label>Nome testata</label><input className="input" value={s.siteName} onChange={(e) => setS({ ...s, siteName: e.target.value })} /></div><div className="field"><label>Payoff</label><input className="input" value={s.tagline} onChange={(e) => setS({ ...s, tagline: e.target.value })} /></div></div>
            <div className="field"><label>Descrizione (meta description home)</label><textarea className="textarea" value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} /></div>
            <div className="field"><label>Link "Abbonati" (vuoto = newsletter)</label><input className="input" value={s.subscribeUrl} onChange={(e) => setS({ ...s, subscribeUrl: e.target.value })} placeholder="https://..." /></div>
            <div className="field"><label>Testo footer / gerenza</label><textarea className="textarea" style={{ minHeight: 60 }} value={s.footerText} onChange={(e) => setS({ ...s, footerText: e.target.value })} /></div>
          </div>
          <div className="panel"><div className="panel-title">Ticker Ultim&apos;ora <label className="switch"><input type="checkbox" checked={s.tickerEnabled} onChange={(e) => setS({ ...s, tickerEnabled: e.target.checked })} /> Attivo</label></div>
            <p className="help">Gli articoli marcati &quot;Ultim&apos;ora&quot; compaiono automaticamente. Qui puoi aggiungere voci manuali.</p>
            {s.ticker.map((t, i) => <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}><input className="input" value={t} onChange={(e) => setS({ ...s, ticker: s.ticker.map((x, j) => (j === i ? e.target.value : x)) })} /><button className="icon-btn danger" onClick={() => setS({ ...s, ticker: s.ticker.filter((_, j) => j !== i) })}>✕</button></div>)}
            <button className="btn btn-outline btn-sm" onClick={() => setS({ ...s, ticker: [...s.ticker, ''] })}>+ Aggiungi voce</button>
          </div>
          <div className="panel"><div className="panel-title">Social</div>
            <div className="form-row">
              {(['facebook', 'instagram', 'x', 'youtube', 'telegram'] as const).map((k) => <div key={k} className="field"><label>{k}</label><input className="input" value={s.socials[k]} onChange={(e) => setS({ ...s, socials: { ...s.socials, [k]: e.target.value } })} /></div>)}
            </div>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Sezioni homepage</div>
            <p className="help">Ordine dei blocchi per categoria nella home.</p>
            <ul className="sortable-list">
              {s.homeSections.map((id, i) => (
                <li key={id}><span className="handle">⋮⋮</span><span className="status-dot" style={{ background: cat(id)?.color }} />{cat(id)?.name}
                  <span className="order-btns"><button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button className="icon-btn" disabled={i === s.homeSections.length - 1} onClick={() => move(i, 1)}>↓</button><button className="icon-btn danger" onClick={() => setS({ ...s, homeSections: s.homeSections.filter((x) => x !== id) })}>✕</button></span></li>
              ))}
            </ul>
            <select className="select" value="" onChange={(e) => e.target.value && setS({ ...s, homeSections: [...s.homeSections, e.target.value] })}>
              <option value="">+ Aggiungi sezione...</option>{categories.filter((c) => !s.homeSections.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="panel"><div className="panel-title">Lettura e community</div>
            <div className="field"><label>Articoli per pagina</label><input className="input" type="number" min={4} max={48} value={s.articlesPerPage} onChange={(e) => setS({ ...s, articlesPerPage: Number(e.target.value) })} /></div>
            <label className="switch"><input type="checkbox" checked={s.commentsModeration} onChange={(e) => setS({ ...s, commentsModeration: e.target.checked })} /> Modera i commenti prima della pubblicazione</label>
          </div>
          <div className="panel"><div className="panel-title">Dati</div>
            <p className="help">I dati della demo sono salvati in <code>data/db.json</code> sul server.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" onClick={() => start(async () => { const json = await exportJsonAction(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = 'aster-news-export.json'; a.click(); })}>Esporta JSON</button>
              <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Ripristinare tutti i dati demo? Le modifiche andranno perse.')) start(async () => { const r = await resetDemoAction(); toast.success(r.message ?? ''); router.refresh(); }); }}>Ripristina dati demo</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
