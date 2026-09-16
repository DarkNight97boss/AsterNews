'use client';

import { useState } from 'react';
import { addMediaAction } from '@/lib/actions';
import { MediaItem } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}
/** Carica un file sull'API di upload (ridimensionamento + WebP + storage). */
export async function uploadFile(file: File, onProgress?: (pct: number) => void, opts: { folder?: string; exclusive?: boolean; lat?: number; lon?: number; alt?: string } = {}): Promise<MediaItem> {
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    if (opts.folder) xhr.setRequestHeader('X-Folder', encodeURIComponent(opts.folder)); if (opts.exclusive) xhr.setRequestHeader('X-Exclusive', '1'); if (opts.lat) xhr.setRequestHeader('X-Lat', String(opts.lat)); if (opts.lon) xhr.setRequestHeader('X-Lon', String(opts.lon)); if (opts.alt) xhr.setRequestHeader('X-Alt', encodeURIComponent(opts.alt));
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => { try { const d = JSON.parse(xhr.responseText); if (xhr.status >= 200 && xhr.status < 300) res(d as MediaItem); else rej(new Error(d.error ?? `Errore ${xhr.status}`)); } catch { rej(new Error(`Errore ${xhr.status}`)); } };
    xhr.onerror = () => rej(new Error('Errore di rete durante il caricamento'));
    xhr.send(file);
  });
}

export function MediaPicker({ media, onPick, onClose }: { media: MediaItem[]; onPick: (m: MediaItem) => void; onClose: () => void }) {
  const [q, setQ] = useState(''); const [url, setUrl] = useState(''); const [sel, setSel] = useState<MediaItem | null>(null); const [busy, setBusy] = useState(false); const [pct, setPct] = useState(0);
  const items = media.filter((m) => m.type === 'image' && (!q || m.name.toLowerCase().includes(q.toLowerCase()) || m.alt.toLowerCase().includes(q.toLowerCase())));
  const addUrl = async () => { setBusy(true); const item = await addMediaAction({ name: url.split('/').pop() || 'immagine', url, alt: '', size: 0 }); setBusy(false); if (item) onPick(item); else toast.error('Impossibile aggiungere il file.'); };
  const upload = async (f: File) => { setBusy(true); try { const item = await uploadFile(f, setPct); onPick(item); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); setPct(0); } };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Libreria media</h3><button className="icon-btn" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="filters">
            <input className="input grow" placeholder="Cerca..." value={q} onChange={(e) => setQ(e.target.value)} />
            <input className="input grow" placeholder="Oppure incolla un URL immagine" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-outline" disabled={!url || busy} onClick={addUrl}>Usa URL</button>
            <label className="btn btn-dark">{busy ? `Caricamento ${pct}%` : 'Carica'}<input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} /></label>
          </div>
          <div className="media-grid">
            {items.map((m) => (
              <div key={m.id} className={`media-item ${sel?.id === m.id ? 'selected' : ''}`} onClick={() => setSel(m)} onDoubleClick={() => onPick(m)}>
                <div className="m-img"><img src={m.variants?.['480'] ?? m.url} alt={m.alt} loading="lazy" /></div><div className="m-name">{m.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>Annulla</button><button className="btn btn-primary" disabled={!sel} onClick={() => sel && onPick(sel)}>Seleziona</button></div>
      </div>
    </div>
  );
}
