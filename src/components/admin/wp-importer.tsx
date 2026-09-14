'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { WpImportInput, WpPreview, importWordPressAction, previewWordPressAction } from '@/lib/actions';
import { Category } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function WpImporter({ categories }: { categories: Category[] }) {
  const [source, setSource] = useState<'wxr' | 'rest'>('wxr');
  const [xml, setXml] = useState(''); const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState(''); const [maxPosts, setMaxPosts] = useState(200);
  const [optimize, setOptimize] = useState(true); const [statusMode, setStatusMode] = useState<'keep' | 'draft' | 'review'>('keep'); const [overwrite, setOverwrite] = useState(false);
  const [preview, setPreview] = useState<WpPreview | null>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [pending, start] = useTransition();
  const input = (): WpImportInput => ({ source, xml: source === 'wxr' ? xml : undefined, url: source === 'rest' ? url : undefined, maxPosts, optimize, statusMode, categoryMap: map, overwrite });
  const onFile = (f?: File) => { if (!f) return; setFileName(f.name); const r = new FileReader(); r.onload = () => setXml(r.result as string); r.readAsText(f); };
  const doPreview = () => start(async () => { const r = await previewWordPressAction(input()); if (!r.ok || !r.preview) { toast.error(r.message ?? 'Errore'); return; } setPreview(r.preview); const m: Record<string, string> = {}; r.preview.categories.forEach((c) => { m[c.name] = c.existingId || '__new'; }); setMap(m); setResult(null); });
  const doImport = () => start(async () => { const r = await importWordPressAction(input()); if (!r.ok) { toast.error(r.message ?? 'Errore'); return; } toast.success(r.message ?? 'Fatto'); setResult({ imported: r.imported ?? 0, skipped: r.skipped ?? 0, errors: r.errors ?? [] }); });
  return (
    <>
      <div className="page-title"><div><h1>Importa da WordPress</h1><p>Porta articoli, categorie, tag, autori e immagini in evidenza. I vecchi URL vengono reindirizzati (301) ai nuovi articoli.</p></div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel">
            <div className="filters" style={{ marginBottom: 16 }}>
              <button className={`btn btn-sm ${source === 'wxr' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setSource('wxr')}>File di esportazione (WXR)</button>
              <button className={`btn btn-sm ${source === 'rest' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setSource('rest')}>Dal sito online (REST API)</button>
            </div>
            {source === 'wxr' ? (
              <>
                <p className="help">In WordPress: <b>Strumenti → Esporta → Articoli</b> (o Tutti i contenuti). Carica qui il file .xml.</p>
                <label className="wp-drop"><b>{fileName || 'Scegli il file .xml esportato'}</b><br /><span className="help">fino a 60 MB</span><input type="file" accept=".xml,text/xml,application/xml" onChange={(e) => onFile(e.target.files?.[0])} /></label>
              </>
            ) : (
              <>
                <p className="help">Funziona con qualsiasi WordPress che espone l&apos;API REST pubblica (attiva per impostazione predefinita). Importa gli articoli pubblicati.</p>
                <div className="form-row" style={{ marginTop: 12 }}>
                  <div className="field"><label>Indirizzo del sito</label><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.miosito.it" /></div>
                  <div className="field"><label>Massimo articoli</label><input className="input" type="number" min={1} max={2000} value={maxPosts} onChange={(e) => setMaxPosts(Number(e.target.value))} /></div>
                </div>
              </>
            )}
            <div className="form-row" style={{ marginTop: 8 }}>
              <div className="field"><label>Stato degli articoli importati</label><select className="select" value={statusMode} onChange={(e) => setStatusMode(e.target.value as typeof statusMode)}><option value="keep">Come su WordPress (pubblicati restano pubblicati)</option><option value="review">Tutti in revisione</option><option value="draft">Tutti in bozza</option></select></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="switch"><input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} /> Passa ogni articolo dal motore SEO (meta, slug, alt, link interni)</label>
              <label className="switch"><input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Sovrascrivi gli articoli già importati con lo stesso URL</label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="btn btn-outline" disabled={pending || (source === 'wxr' ? !xml : !url)} onClick={doPreview}>{pending ? 'Analizzo…' : '1. Anteprima'}</button>
              <button className="btn btn-primary" disabled={pending || !preview} onClick={doImport}>{pending ? 'Importo…' : `2. Importa ${preview ? preview.total + ' articoli' : ''}`}</button>
            </div>
          </div>
          {preview && (
            <div className="panel">
              <div className="panel-title">Anteprima</div>
              <div className="stats" style={{ marginBottom: 16 }}>
                <div className="stat"><div className="stat-label">Articoli trovati</div><div className="stat-value">{preview.total}</div><div className="stat-sub">{preview.publishable} pubblicati</div></div>
                <div className="stat" style={{ ['--stat-color' as string]: '#e67e00' }}><div className="stat-label">Già presenti</div><div className="stat-value">{preview.conflicts}</div><div className="stat-sub">{overwrite ? 'verranno sovrascritti' : 'verranno saltati'}</div></div>
                <div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Autori</div><div className="stat-value">{preview.authors.length}</div><div className="stat-sub">{preview.authors.slice(0, 3).join(', ')}</div></div>
              </div>
              <div className="panel-title">Mappa delle categorie</div>
              <table className="table"><thead><tr><th>Categoria WordPress</th><th>Articoli</th><th>Diventa</th></tr></thead><tbody>
                {preview.categories.map((c) => (
                  <tr key={c.name}><td><b>{c.name}</b></td><td>{c.count}</td><td><select className="select" value={map[c.name] ?? '__new'} onChange={(e) => setMap({ ...map, [c.name]: e.target.value })}><option value="__new">Crea nuova categoria «{c.name}»</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="__skip">Ignora (usa la successiva)</option></select></td></tr>
                ))}
              </tbody></table>
              <p className="help" style={{ marginTop: 10 }}>Esempi di titoli: {preview.sample.join(' · ')}</p>
            </div>
          )}
          {result && (
            <div className="panel"><div className="panel-title">Risultato</div><p><b>{result.imported}</b> articoli importati, <b>{result.skipped}</b> saltati.</p>{result.errors.length > 0 && <ul className="seo-report">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}<Link href="/admin/articoli" className="btn btn-dark btn-sm">Vai agli articoli</Link></div>
          )}
        </div>
        <div>
          <div className="panel"><div className="panel-title">Cosa viene importato</div>
            <ul className="seo-report">
              <li>Titolo, testo (pulito da blocchi Gutenberg e shortcode), estratto, data, slug</li>
              <li>Categorie (mappabili su quelle esistenti) e tag</li>
              <li>Autori: se non esistono vengono creati come collaboratori disattivati</li>
              <li>Immagine in evidenza (o prima immagine del testo) come copertina</li>
              <li>Stato: pubblicato, bozza o in revisione</li>
              <li>Vecchio URL salvato: chi arriva dai link WordPress viene reindirizzato con 301</li>
              <li>Opzionale: ottimizzazione SEO automatica di ogni articolo</li>
            </ul>
          </div>
          <div className="panel"><div className="panel-title">Consigli</div><p className="help">Le immagini restano sul vecchio dominio: finché è online funzionano; per portarle qui usa la libreria media. Dopo l&apos;importazione controlla la Dashboard SEO per gli articoli con punteggio basso.</p></div>
        </div>
      </div>
    </>
  );
}
