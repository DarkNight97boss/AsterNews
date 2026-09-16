'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { ImportJob, WpImportOptions, cancelImportJobAction, getImportJobAction, previewImportAction, startImportJobAction } from '@/lib/actions';
import { Category } from '@/lib/models';
import type { ImportPreview } from '@/lib/import-jobs';
import { toast } from '@/components/ui/toaster';

const STATUS: Record<ImportJob['status'], string> = { queued: 'In coda', running: 'In corso', done: 'Completata', failed: 'Fallita', cancelled: 'Annullata' };

export function WpImporter({ categories, jobs: initialJobs, serverless }: { categories: Category[]; jobs: ImportJob[]; serverless: boolean }) {
  const [source, setSource] = useState<'wxr' | 'rest' | 'feed'>(serverless ? 'rest' : 'wxr');
  const [file, setFile] = useState<{ name: string; size: number } | null>(null); const [uploading, setUploading] = useState(0);
  const [url, setUrl] = useState(''); const [maxPosts, setMaxPosts] = useState(100000);
  const [optimize, setOptimize] = useState(true); const [statusMode, setStatusMode] = useState<'keep' | 'draft' | 'review'>('keep'); const [overwrite, setOverwrite] = useState(false); const [downloadMedia, setDownloadMedia] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null); const [map, setMap] = useState<Record<string, string>>({});
  const [jobs, setJobs] = useState<ImportJob[]>(initialJobs); const [active, setActive] = useState<string | null>(initialJobs.find((j) => j.status === 'running' || j.status === 'queued')?.id ?? null);
  const [pending, start] = useTransition();
  const opts = (): WpImportOptions => ({ source, file: file?.name, url, maxPosts, optimize, statusMode, categoryMap: map, overwrite, downloadMedia });

  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => { const j = await getImportJobAction(active); if (!j) return; setJobs((list) => [j, ...list.filter((x) => x.id !== j.id)]); if (j.status !== 'running' && j.status !== 'queued') { setActive(null); toast.success(j.message); } }, 2500);
    return () => clearInterval(t);
  }, [active]);

  const upload = (f?: File) => {
    if (!f) return;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/import/upload'); xhr.setRequestHeader('Content-Type', 'application/xml');
    xhr.upload.onprogress = (e) => setUploading(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => { setUploading(0); try { const r = JSON.parse(xhr.responseText); if (r.ok) { setFile({ name: r.file, size: r.size }); toast.success(`File caricato (${(r.size / 1048576).toFixed(1)} MB).`); } else toast.error(r.message); } catch { toast.error('Errore nel caricamento.'); } };
    xhr.onerror = () => { setUploading(0); toast.error('Errore di rete durante il caricamento.'); };
    xhr.send(f);
  };
  const doPreview = () => start(async () => { const r = await previewImportAction(opts()); if (!r.ok || !r.preview) { toast.error(r.message ?? 'Errore'); return; } setPreview(r.preview); const m: Record<string, string> = {}; r.preview.categories.forEach((c) => { m[c.name] = c.existingId || '__new'; }); setMap(m); });
  const doStart = () => start(async () => { const r = await startImportJobAction(opts()); if (!r.ok || !r.id) { toast.error(r.message ?? 'Errore'); return; } toast.success('Importazione avviata in background.'); setActive(r.id); const j = await getImportJobAction(r.id); if (j) setJobs((l) => [j, ...l]); });
  const ready = source === 'wxr' ? !!file : /^https?:\/\//.test(url);
  return (
    <>
      <div className="page-title"><div><h1>Importa da WordPress</h1><p>Anche archivi da centinaia di migliaia di articoli: l&apos;importazione gira in background a lotti, si può seguire e riprendere. I vecchi URL vengono reindirizzati (301).</p></div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel">
            <div className="filters" style={{ marginBottom: 16 }}>
              <button className={`btn btn-sm ${source === 'wxr' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setSource('wxr')}>File di esportazione (WXR)</button>
              <button className={`btn btn-sm ${source === 'rest' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setSource('rest')}>Dal sito online (REST API)</button>
              <button className={`btn btn-sm ${source === 'feed' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setSource('feed')}>Da un feed RSS / Atom</button>
            </div>
            {source === 'wxr' ? (
              <>
                {serverless ? <p className="error-text">Su hosting serverless (Vercel) l&apos;upload è limitato a 4,5 MB: per archivi grandi usa l&apos;API REST oppure lo script da terminale <code>npm run import:wp -- --file export.xml</code>, che legge il file dal tuo computer e scrive direttamente nel database.</p> : <p className="help">In WordPress: <b>Strumenti → Esporta → Articoli</b>. Il file viene caricato in streaming e letto a blocchi: nessun limite pratico di dimensione.</p>}
                <label className="wp-drop"><b>{file ? `${file.name} (${(file.size / 1048576).toFixed(1)} MB)` : uploading ? `Caricamento ${uploading}%` : 'Scegli il file .xml esportato'}</b><input type="file" accept=".xml,text/xml,application/xml" onChange={(e) => upload(e.target.files?.[0])} /></label>
              </>
            ) : (
              <>
                <p className="help">{source === 'feed' ? 'Qualsiasi sito con feed RSS o Atom (Blogger, Medium, Substack, Joomla, un altro giornale). Vengono importati gli articoli presenti nel feed, di solito gli ultimi 10-50.' : 'Funziona con qualsiasi WordPress con API REST pubblica. Pagina per pagina, riprende da sola se si interrompe.'}</p>
                <div className="form-row" style={{ marginTop: 12 }}><div className="field"><label>Indirizzo del sito</label><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.miosito.it" /></div><div className="field"><label>Massimo articoli</label><input className="input" type="number" min={1} value={maxPosts} onChange={(e) => setMaxPosts(Number(e.target.value))} /></div></div>
              </>
            )}
            <div className="form-row" style={{ marginTop: 8 }}><div className="field"><label>Stato degli articoli importati</label><select className="select" value={statusMode} onChange={(e) => setStatusMode(e.target.value as typeof statusMode)}><option value="keep">Come su WordPress</option><option value="review">Tutti in revisione</option><option value="draft">Tutti in bozza</option></select></div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="switch"><input type="checkbox" checked={optimize} onChange={(e) => setOptimize(e.target.checked)} /> Passa ogni articolo dal motore SEO (meta, slug, alt, link interni)</label>
              <label className="switch"><input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Sovrascrivi gli articoli già importati (stesso ID WordPress)</label>
              {!serverless && <label className="switch"><input type="checkbox" checked={downloadMedia} onChange={(e) => setDownloadMedia(e.target.checked)} /> Scarica le copertine sul server (dopo l&apos;importazione)</label>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button className="btn btn-outline" disabled={pending || !ready} onClick={doPreview}>{pending ? 'Analizzo…' : '1. Anteprima'}</button>
              <button className="btn btn-primary" disabled={pending || !ready || !!active} onClick={doStart}>{active ? 'Importazione in corso…' : '2. Avvia importazione'}</button>
            </div>
          </div>
          {preview && (
            <div className="panel"><div className="panel-title">Anteprima {preview.total >= 5000 && '(campione dei primi 5.000)'}</div>
              <div className="stats" style={{ marginBottom: 16 }}>
                <div className="stat"><div className="stat-label">Articoli trovati</div><div className="stat-value">{preview.total}</div><div className="stat-sub">{preview.publishable} pubblicati</div></div>
                <div className="stat" style={{ ['--stat-color' as string]: '#e67e00' }}><div className="stat-label">Già importati</div><div className="stat-value">{preview.existing}</div><div className="stat-sub">{overwrite ? 'verranno aggiornati' : 'verranno saltati'}</div></div>
                <div className="stat" style={{ ['--stat-color' as string]: '#1f4e9c' }}><div className="stat-label">Autori</div><div className="stat-value">{preview.authors.length}</div><div className="stat-sub">{preview.authors.slice(0, 3).join(', ')}</div></div>
              </div>
              <div className="panel-title">Mappa delle categorie</div>
              <table className="table"><thead><tr><th>Categoria WordPress</th><th>Articoli</th><th>Diventa</th></tr></thead><tbody>{preview.categories.map((c) => <tr key={c.name}><td><b>{c.name}</b></td><td>{c.count}</td><td><select className="select" value={map[c.name] ?? '__new'} onChange={(e) => setMap({ ...map, [c.name]: e.target.value })}><option value="__new">Crea nuova categoria «{c.name}»</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}<option value="__skip">Ignora (usa la successiva)</option></select></td></tr>)}</tbody></table>
              <p className="help" style={{ marginTop: 10 }}>Esempi: {preview.sample.join(' · ')}</p>
            </div>
          )}
          {jobs.length > 0 && (
            <div className="panel"><div className="panel-title">Importazioni</div>
              {jobs.map((j) => { const pct = j.total ? Math.min(100, Math.round((j.processed / j.total) * 100)) : 0; return (
                <div key={j.id} className="job">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><b>{j.source === 'wxr' ? `File ${j.file}` : `${j.source === 'feed' ? 'Feed' : 'REST'} ${String(j.options.url ?? '')}`}</b><span className={`badge ${j.status === 'done' ? 'badge-green' : j.status === 'running' ? 'badge-blue' : j.status === 'failed' ? 'badge-red' : 'badge-gray'}`}>{STATUS[j.status]}</span></div>
                  <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                  <div className="help">{j.processed}/{j.total || '?'} elaborati · {j.imported} importati · {j.skipped} saltati · {j.message}{j.errors.length > 0 && ` · ${j.errors.length} errori`}</div>
                  {(j.status === 'running' || j.status === 'queued') && <button className="btn btn-ghost btn-sm" onClick={() => start(async () => { await cancelImportJobAction(j.id); setActive(null); })}>Annulla</button>}
                  {j.errors.length > 0 && <details><summary className="help">Errori</summary><ul className="seo-report">{j.errors.slice(-20).map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
                </div>
              ); })}
              <Link href="/admin/articoli" className="btn btn-dark btn-sm">Vai agli articoli</Link>
            </div>
          )}
        </div>
        <div>
          <div className="panel"><div className="panel-title">Come funziona</div><ul className="seo-report"><li>Lettura in streaming del file o pagina per pagina dell&apos;API</li><li>Inserimenti a lotti di 200 in transazione; avanzamento salvato ogni lotto</li><li>Ripresa automatica dal punto di interruzione, articoli riconosciuti dall&apos;ID WordPress (nessun doppione)</li><li>Categorie mappabili, tag e autori creati al volo, immagine in evidenza come copertina</li><li>Redirect permanenti dai vecchi URL, anche /anno/mese/slug/</li></ul></div>
          <div className="panel"><div className="panel-title">Archivi enormi</div><p className="help">Per esportazioni da decine di GB conviene lo script da terminale, che non passa dal browser: <code>npm run import:wp -- --file export.xml</code> (o <code>--url https://sito</code>). Usa lo stesso motore e lo stesso database.</p></div>
        </div>
      </div>
    </>
  );
}
