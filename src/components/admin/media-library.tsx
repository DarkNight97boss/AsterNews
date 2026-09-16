'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addMediaAction, deleteMediaAction } from '@/lib/actions';
import { compressOldMediaAction, cropMediaAction, editMediaAction, emptyMediaTrashAction, findDuplicatesAction, importStockAction, searchStockAction, trashMediaAction, updateMediaMetaAction, videoReadyAction, videoUploadAction, watermarkMediaAction } from '@/lib/actions-media';
import { MediaItem, User } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { uploadFile } from './media-picker';

const fileSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const RATIOS = ['16:9', '1:1', '9:16', '3:2', '4:5'];
type StockImage = { id: string; provider: 'unsplash' | 'pexels'; thumb: string; full: string; width: number; height: number; author: string; authorUrl: string; credit: string; alt: string };

/** Libreria media: upload (con esclusiva/filigrana), cartelle, tag, cestino, ritagli per formato, ritocchi, banca immagini, duplicati, video hosting. */
export function MediaLibrary({ media, trash, users, storageLabel, videoProvider, stockProviders }: { media: MediaItem[]; trash: MediaItem[]; users: User[]; storageLabel: string; videoProvider: string; stockProviders: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState(''); const [url, setUrl] = useState(''); const [over, setOver] = useState(false); const [sel, setSel] = useState<MediaItem | null>(null);
  const [folder, setFolder] = useState(''); const [view, setView] = useState<'all' | 'trash' | 'dupes' | 'stock' | 'video'>('all'); const [exclusive, setExclusive] = useState(false); const [uploadFolder, setUploadFolder] = useState('');
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [dupes, setDupes] = useState<{ hash: string; items: MediaItem[] }[]>([]); const [stockQ, setStockQ] = useState(''); const [stockProv, setStockProv] = useState<'unsplash' | 'pexels'>((stockProviders[0] as 'unsplash' | 'pexels') ?? 'unsplash'); const [stock, setStock] = useState<StockImage[]>([]);
  const [ops, setOps] = useState<{ rotate: 0 | 90 | 180 | 270; brightness: number; contrast: number; grayscale: boolean; text: string }>({ rotate: 0, brightness: 1, contrast: 1, grayscale: false, text: '' });
  const [pending, start] = useTransition();
  const folders = [...new Set(media.map((m) => m.folder).filter(Boolean))] as string[];
  const addFiles = (files: File[]) => start(async () => {
    for (const f of files.filter((x) => x.type.startsWith('image/'))) {
      if (f.size > 30 * 1024 * 1024) { toast.error(`${f.name}: massimo 30 MB.`); continue; }
      try { setProgress({ name: f.name, pct: 0 }); await uploadFile(f, (pct) => setProgress({ name: f.name, pct }), { folder: uploadFolder, exclusive }); toast.success(`${f.name} caricato e ottimizzato.`); } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    setProgress(null); router.refresh();
  });
  const uploadVideo = (file: File) => start(async () => {
    const u = await videoUploadAction(file.name); if (!u.ok || !u.uploadUrl) { toast.error(u.message ?? 'Errore'); return; }
    setProgress({ name: file.name, pct: 0 });
    await new Promise<void>((res, rej) => { const xhr = new XMLHttpRequest(); xhr.open(u.method!, u.uploadUrl!); xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress({ name: file.name, pct: Math.round((e.loaded / e.total) * 100) }); }; xhr.onload = () => (xhr.status < 300 ? res() : rej(new Error(`Upload ${xhr.status}`))); xhr.onerror = () => rej(new Error('Rete')); if (u.method === 'POST') { const fd = new FormData(); fd.append('file', file); xhr.send(fd); } else xhr.send(file); }).catch((e) => toast.error((e as Error).message));
    setProgress({ name: file.name + ' (elaborazione)', pct: 100 });
    for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 5000)); const r = await videoReadyAction(u.provider!, u.id!, file.name); if (r.ok) { toast.success(r.message ?? 'Video pronto'); break; } }
    setProgress(null); router.refresh();
  });
  const list = view === 'trash' ? trash : media;
  const filtered = list.filter((m) => (!folder || m.folder === folder) && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase()) || (m.tags ?? '').toLowerCase().includes(q.toLowerCase()) || (m.credit ?? '').toLowerCase().includes(q.toLowerCase())));
  const setFocal = (e: React.MouseEvent<HTMLImageElement>) => { if (!sel) return; const r = e.currentTarget.getBoundingClientRect(); setSel({ ...sel, focalX: Math.round(((e.clientX - r.left) / r.width) * 100) / 100, focalY: Math.round(((e.clientY - r.top) / r.height) * 100) / 100 }); };
  const expired = (m: MediaItem) => m.rightsUntil && m.rightsUntil < new Date().toISOString().slice(0, 10);
  return (
    <>
      <div className="page-title"><div><h1>Libreria media</h1><p>{media.length} file · archiviazione: {storageLabel}. Le immagini vengono ridimensionate, convertite in WebP e generate in cinque misure.</p></div><div className="actions"><ActionButton className="btn btn-outline btn-sm" action={() => compressOldMediaAction(20)}>Comprimi i file pesanti</ActionButton><button className="btn btn-outline btn-sm" onClick={() => start(async () => { setDupes(await findDuplicatesAction()); setView('dupes'); })}>Trova duplicati</button></div></div>
      <label className={`dropzone ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}>
        <b>Trascina qui le immagini</b> oppure clicca per selezionarle<br /><span className="help">JPG, PNG, WebP, GIF, AVIF · fino a 30 MB</span>
        {progress && <div className="help" style={{ marginTop: 8 }}>Caricamento di {progress.name}: {progress.pct}%</div>}
        <input type="file" accept="image/*" multiple onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </label>
      <div className="filters">
        <input className="input" style={{ maxWidth: 200 }} placeholder="Cartella per i nuovi file" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} list="folders" /><datalist id="folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
        <label className="switch"><input type="checkbox" checked={exclusive} onChange={(e) => setExclusive(e.target.checked)} /> Foto esclusiva (filigrana automatica)</label>
        <input className="input grow" placeholder="Aggiungi da URL (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-outline" disabled={!url} onClick={() => start(async () => { await addMediaAction({ name: url.split('/').pop() || 'immagine', url, alt: '', size: 0 }); setUrl(''); toast.success('Immagine aggiunta.'); router.refresh(); })}>Aggiungi URL</button>
      </div>
      <div className="filters">
        <button className={`btn btn-sm ${view === 'all' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setView('all')}>Tutti ({media.length})</button>
        <button className={`btn btn-sm ${view === 'trash' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setView('trash')}>🗑 Cestino ({trash.length})</button>
        {stockProviders.length > 0 && <button className={`btn btn-sm ${view === 'stock' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setView('stock')}>🏦 Banca immagini</button>}
        {videoProvider !== 'none' && <button className={`btn btn-sm ${view === 'video' ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setView('video')}>🎬 Video ({videoProvider})</button>}
        <select className="select" value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Tutte le cartelle</option>{folders.map((f) => <option key={f} value={f}>{f}</option>)}</select>
        <input className="input grow" placeholder="Cerca per nome, alt, tag, credit…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {view === 'stock' && <div className="panel"><div className="panel-title">Banca immagini <span className="help">(crediti automatici nella didascalia)</span></div>
        <form className="filters" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await searchStockAction(stockQ, stockProv); if (r.ok) setStock(r.items ?? []); else toast.error(r.message ?? 'Errore'); }); }}><select className="select" value={stockProv} onChange={(e) => setStockProv(e.target.value as 'unsplash' | 'pexels')}>{stockProviders.map((p) => <option key={p} value={p}>{p}</option>)}</select><input className="input grow" placeholder="Cerca foto (es. stadio, pioggia, mercato)" value={stockQ} onChange={(e) => setStockQ(e.target.value)} /><button className="btn btn-outline btn-sm" disabled={pending}>Cerca</button></form>
        <div className="media-grid">{stock.map((s) => <div key={s.id} className="media-item"><div className="m-img"><img src={s.thumb} alt={s.alt} loading="lazy" /></div><div className="m-name">{s.author} <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await importStockAction(s); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Importa</button></div></div>)}</div>
      </div>}
      {view === 'video' && <div className="panel"><div className="panel-title">Carica un video ({videoProvider})</div><p className="help" style={{ marginBottom: 8 }}>Il file va direttamente al servizio di hosting; quando è pronto compare in libreria come video e si può usare nel formato «Video» dell&apos;articolo o come embed.</p><input type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f); }} />{progress && <div className="help" style={{ marginTop: 8 }}>{progress.name}: {progress.pct}%</div>}</div>}
      {view === 'dupes' && <div className="panel"><div className="panel-title">File duplicati ({dupes.length} gruppi)</div>{dupes.length === 0 && <p className="help">Nessun doppione tra i file caricati (l&apos;impronta viene calcolata in upload).</p>}{dupes.map((g) => <div key={g.hash} className="dupe-row">{g.items.map((m, i) => <div key={m.id} className="media-item"><div className="m-img"><img src={m.variants?.['360'] ?? m.url} alt="" /></div><div className="m-name">{m.name}{i > 0 && <ActionButton className="btn btn-ghost btn-sm" action={() => trashMediaAction(m.id)}>nel cestino</ActionButton>}</div></div>)}</div>)}</div>}
      {view === 'trash' && trash.length > 0 && <div className="lock-banner" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>I file nel cestino vengono eliminati dopo 30 giorni.<ActionButton className="btn btn-danger btn-sm" confirm="Svuotare il cestino dei media?" action={emptyMediaTrashAction}>Svuota cestino</ActionButton></div>}
      {(view === 'all' || view === 'trash') && <div className="admin-grid-2">
        <div className="media-grid">
          {filtered.map((m) => <div key={m.id} className={`media-item ${sel?.id === m.id ? 'selected' : ''}`} onClick={() => setSel({ ...m })}><div className="m-img">{m.type === 'video' ? <div className="m-video">🎬</div> : <img src={m.variants?.['360'] ?? m.variants?.['480'] ?? m.url} alt={m.alt} loading="lazy" />}{m.exclusive && <span className="m-badge">esclusiva</span>}{expired(m) && <span className="m-badge m-warn">diritti scaduti</span>}</div><div className="m-name">{m.name}{!m.alt && <span title="Manca il testo alternativo" style={{ color: 'var(--red)' }}> ⚠</span>}</div></div>)}
          {filtered.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}><h3>Nessun file</h3></div>}
        </div>
        <div>
          {sel ? (
            <div className="panel" style={{ position: 'sticky', top: 80 }}>
              <div className="panel-title">Dettagli file</div>
              {sel.type === 'video' ? <iframe src={sel.url} style={{ width: '100%', aspectRatio: '16/9', border: 0 }} allowFullScreen title={sel.name} /> : <>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  <img src={sel.variants?.['768'] ?? sel.variants?.['960'] ?? sel.url} alt="" title="Clicca per impostare il punto focale (centro dei ritagli)" onClick={setFocal} style={{ borderRadius: 4, maxHeight: 240, objectFit: 'contain', width: '100%', background: 'var(--gray-100)', cursor: 'crosshair', display: 'block' }} />
                  <span style={{ position: 'absolute', left: `${(sel.focalX ?? 0.5) * 100}%`, top: `${(sel.focalY ?? 0.5) * 100}%`, width: 18, height: 18, marginLeft: -9, marginTop: -9, border: '3px solid var(--red)', borderRadius: '50%', boxShadow: '0 0 0 2px #fff', pointerEvents: 'none' }} />
                </div>
                <div className="crop-previews">{RATIOS.map((r) => { const [w, h] = r.split(':').map(Number); return <div key={r} title={`Anteprima ${r}`}><div className="crop-box" style={{ aspectRatio: `${w}/${h}` }}><img src={sel.variants?.['360'] ?? sel.url} alt="" style={{ objectPosition: `${(sel.focalX ?? 0.5) * 100}% ${(sel.focalY ?? 0.5) * 100}%` }} /></div><button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const x = await cropMediaAction(sel.id, r); (x.ok ? toast.success : toast.error)(x.message ?? ''); router.refresh(); })}>{r}</button></div>; })}</div>
                <div className="help" style={{ marginBottom: 8 }}>Clicca sull&apos;immagine per il punto focale; le anteprime mostrano i ritagli per formato, premi il formato per salvarlo come file.</div>
              </>}
              <div className="field"><label>Nome</label><input className="input" value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} /></div>
              <div className="field"><label>Testo alternativo (alt)</label><input className="input" value={sel.alt} onChange={(e) => setSel({ ...sel, alt: e.target.value })} /></div>
              <div className="form-row"><div className="field"><label>Cartella</label><input className="input" value={sel.folder ?? ''} onChange={(e) => setSel({ ...sel, folder: e.target.value })} list="folders" /></div><div className="field"><label>Tag</label><input className="input" value={sel.tags ?? ''} onChange={(e) => setSel({ ...sel, tags: e.target.value })} placeholder="comune, stadio, 2026" /></div></div>
              <div className="form-row"><div className="field"><label>Credit / autore</label><input className="input" value={sel.credit ?? ''} onChange={(e) => setSel({ ...sel, credit: e.target.value })} placeholder="Foto Rossi / Ansa" /></div><div className="field"><label>Licenza</label><input className="input" value={sel.license ?? ''} onChange={(e) => setSel({ ...sel, license: e.target.value })} placeholder="Redazionale, CC BY, agenzia…" /></div></div>
              <div className="form-row"><div className="field"><label>Diritti fino al</label><input className="input" type="date" value={sel.rightsUntil ?? ''} onChange={(e) => setSel({ ...sel, rightsUntil: e.target.value })} /></div><div className="field"><label>&nbsp;</label><label className="switch"><input type="checkbox" checked={!!sel.exclusive} onChange={(e) => setSel({ ...sel, exclusive: e.target.checked })} /> Esclusiva</label></div></div>
              {expired(sel) && <p className="error-text">Diritti scaduti il {sel.rightsUntil}: non usare questa foto in nuovi articoli.</p>}
              <div className="help">Caricato da {users.find((u) => u.id === sel.uploadedBy)?.name} il {formatDate(sel.createdAt)} · {fileSize(sel.size)}{sel.provider ? ` · ${sel.provider}` : ''}{sel.width ? ` · ${sel.width}×${sel.height}` : ''}{sel.lat ? ` · 📍 ${sel.lat.toFixed(4)}, ${sel.lon?.toFixed(4)}` : ''}</div>
              {sel.type === 'image' && <details className="edit-tools"><summary>Ritocca (rotazione, luminosità, contrasto, testo)</summary>
                <div className="rule-row"><select className="select" value={ops.rotate} onChange={(e) => setOps({ ...ops, rotate: Number(e.target.value) as 0 | 90 | 180 | 270 })}><option value={0}>Nessuna rotazione</option><option value={90}>Ruota 90°</option><option value={180}>Ruota 180°</option><option value={270}>Ruota 270°</option></select><label>Luminosità <input type="range" min={0.5} max={1.5} step={0.05} value={ops.brightness} onChange={(e) => setOps({ ...ops, brightness: Number(e.target.value) })} /></label><label>Contrasto <input type="range" min={0.5} max={1.5} step={0.05} value={ops.contrast} onChange={(e) => setOps({ ...ops, contrast: Number(e.target.value) })} /></label><label className="switch"><input type="checkbox" checked={ops.grayscale} onChange={(e) => setOps({ ...ops, grayscale: e.target.checked })} /> bianco e nero</label></div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><input className="input" placeholder="Testo sovrapposto (facoltativo)" value={ops.text} onChange={(e) => setOps({ ...ops, text: e.target.value })} /><button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await editMediaAction(sel.id, ops); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Applica → nuovo file</button></div>
              </details>}
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                <ActionButton className="btn btn-primary btn-sm" action={() => updateMediaMetaAction(sel)}>Salva</ActionButton>
                {sel.type === 'image' && <ActionButton className="btn btn-outline btn-sm" action={() => watermarkMediaAction(sel.id)}>Filigrana</ActionButton>}
                {view === 'trash' ? <><ActionButton className="btn btn-outline btn-sm" action={() => trashMediaAction(sel.id, true)} onDone={() => setSel(null)}>Ripristina</ActionButton><ActionButton className="btn btn-danger btn-sm" confirm="Eliminare definitivamente anche dallo storage?" action={() => deleteMediaAction(sel.id)} onDone={() => setSel(null)}>Elimina</ActionButton></> : <ActionButton className="btn btn-danger btn-sm" action={() => trashMediaAction(sel.id)} onDone={() => setSel(null)}>Nel cestino</ActionButton>}
              </div>
            </div>
          ) : <div className="panel help">Seleziona un file per vederne i dettagli.</div>}
        </div>
      </div>}
    </>
  );
}
