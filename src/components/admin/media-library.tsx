'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addMediaAction, deleteMediaAction, updateMediaAction } from '@/lib/actions';
import { MediaItem, User } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { uploadFile } from './media-picker';

const fileSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export function MediaLibrary({ media, users, storageLabel }: { media: MediaItem[]; users: User[]; storageLabel: string }) {
  const router = useRouter();
  const [q, setQ] = useState(''); const [url, setUrl] = useState(''); const [over, setOver] = useState(false); const [sel, setSel] = useState<MediaItem | null>(null);
  const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
  const [, start] = useTransition();
  const addFiles = (files: File[]) => start(async () => {
    for (const f of files.filter((x) => x.type.startsWith('image/'))) {
      if (f.size > 30 * 1024 * 1024) { toast.error(`${f.name}: massimo 30 MB.`); continue; }
      try { setProgress({ name: f.name, pct: 0 }); await uploadFile(f, (pct) => setProgress({ name: f.name, pct })); toast.success(`${f.name} caricato e ottimizzato.`); } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    setProgress(null);
    router.refresh();
  });
  const filtered = media.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase()));
  const setFocal = (e: React.MouseEvent<HTMLImageElement>) => { if (!sel) return; const r = e.currentTarget.getBoundingClientRect(); setSel({ ...sel, focalX: Math.round(((e.clientX - r.left) / r.width) * 100) / 100, focalY: Math.round(((e.clientY - r.top) / r.height) * 100) / 100 }); };
  return (
    <>
      <div className="page-title"><div><h1>Libreria media</h1><p>{media.length} file · archiviazione: {storageLabel}. Le immagini vengono ridimensionate, convertite in WebP e generate in tre misure.</p></div></div>
      <label className={`dropzone ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}>
        <b>Trascina qui le immagini</b> oppure clicca per selezionarle<br /><span className="help">JPG, PNG, WebP, GIF, AVIF · fino a 30 MB</span>
        {progress && <div className="help" style={{ marginTop: 8 }}>Caricamento di {progress.name}: {progress.pct}%</div>}
        <input type="file" accept="image/*" multiple onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </label>
      <div className="filters">
        <input className="input grow" placeholder="Cerca per nome o alt..." value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input grow" placeholder="Aggiungi da URL (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-outline" disabled={!url} onClick={() => start(async () => { await addMediaAction({ name: url.split('/').pop() || 'immagine', url, alt: '', size: 0 }); setUrl(''); toast.success('Immagine aggiunta.'); router.refresh(); })}>Aggiungi URL</button>
      </div>
      <div className="admin-grid-2">
        <div className="media-grid">
          {filtered.map((m) => <div key={m.id} className={`media-item ${sel?.id === m.id ? 'selected' : ''}`} onClick={() => setSel({ ...m })}><div className="m-img"><img src={m.variants?.['480'] ?? m.url} alt={m.alt} loading="lazy" /></div><div className="m-name">{m.name}{!m.alt && <span title="Manca il testo alternativo" style={{ color: 'var(--red)' }}> ⚠</span>}</div></div>)}
          {filtered.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}><h3>Nessun file</h3></div>}
        </div>
        <div>
          {sel ? (
            <div className="panel" style={{ position: 'sticky', top: 80 }}>
              <div className="panel-title">Dettagli file</div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={sel.variants?.['960'] ?? sel.url} alt="" title="Clicca per impostare il punto focale (centro dei ritagli)" onClick={setFocal} style={{ borderRadius: 4, maxHeight: 260, objectFit: 'contain', width: '100%', background: 'var(--gray-100)', cursor: 'crosshair', display: 'block' }} />
                <span style={{ position: 'absolute', left: `${(sel.focalX ?? 0.5) * 100}%`, top: `${(sel.focalY ?? 0.5) * 100}%`, width: 18, height: 18, marginLeft: -9, marginTop: -9, border: '3px solid var(--red)', borderRadius: '50%', boxShadow: '0 0 0 2px #fff', pointerEvents: 'none' }} />
              </div>
              <div className="help" style={{ marginBottom: 10 }}>Clicca sull&apos;immagine per scegliere il punto focale: le anteprime ritagliate resteranno centrate lì.{sel.width ? ` · ${sel.width}×${sel.height}` : ''}</div>
              <div className="field"><label>Nome</label><input className="input" value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} /></div>
              <div className="field"><label>Testo alternativo (alt) — descrivi la foto per accessibilità e Google</label><input className="input" value={sel.alt} onChange={(e) => setSel({ ...sel, alt: e.target.value })} /></div>
              <div className="field"><label>URL</label><input className="input" value={sel.url.slice(0, 90)} readOnly onClick={() => navigator.clipboard?.writeText(sel.url).then(() => toast.info('URL copiato'))} title="Clicca per copiare" /></div>
              {sel.variants && Object.keys(sel.variants).length > 0 && <div className="help">Varianti: {Object.keys(sel.variants).map((w) => `${w}px`).join(', ')}</div>}
              <div className="help">Caricato da {users.find((u) => u.id === sel.uploadedBy)?.name} il {formatDate(sel.createdAt)} · {fileSize(sel.size)}{sel.provider ? ` · ${sel.provider}` : ''}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <ActionButton className="btn btn-primary btn-sm" action={() => updateMediaAction(sel)}>Salva</ActionButton>
                <ActionButton className="btn btn-danger btn-sm" confirm="Eliminare questo file anche dallo storage?" action={() => deleteMediaAction(sel.id)} onDone={() => setSel(null)}>Elimina</ActionButton>
              </div>
            </div>
          ) : <div className="panel help">Seleziona un file per vederne i dettagli.</div>}
        </div>
      </div>
    </>
  );
}
