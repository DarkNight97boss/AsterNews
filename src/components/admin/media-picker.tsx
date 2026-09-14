'use client';

import { useState } from 'react';
import { addMediaAction } from '@/lib/actions';
import { MediaItem } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
}

export function MediaPicker({ media, onPick, onClose }: { media: MediaItem[]; onPick: (m: MediaItem) => void; onClose: () => void }) {
  const [q, setQ] = useState(''); const [url, setUrl] = useState(''); const [sel, setSel] = useState<MediaItem | null>(null); const [busy, setBusy] = useState(false);
  const items = media.filter((m) => m.type === 'image' && (!q || m.name.toLowerCase().includes(q.toLowerCase())));
  const add = async (m: { name: string; url: string; alt: string; size: number }) => {
    setBusy(true);
    const item = await addMediaAction(m);
    setBusy(false);
    if (item) onPick(item); else toast.error('Impossibile aggiungere il file.');
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Libreria media</h3><button className="icon-btn" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="filters">
            <input className="input grow" placeholder="Cerca..." value={q} onChange={(e) => setQ(e.target.value)} />
            <input className="input grow" placeholder="Oppure incolla un URL immagine" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button className="btn btn-outline" disabled={!url || busy} onClick={() => add({ name: url.split('/').pop() || 'immagine', url, alt: '', size: 0 })}>Usa URL</button>
            <label className="btn btn-dark">Carica<input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2 * 1024 * 1024) { toast.error('Massimo 2 MB nella demo.'); return; } add({ name: f.name, url: await readFileAsDataUrl(f), alt: f.name, size: f.size }); }} /></label>
          </div>
          <div className="media-grid">
            {items.map((m) => (
              <div key={m.id} className={`media-item ${sel?.id === m.id ? 'selected' : ''}`} onClick={() => setSel(m)} onDoubleClick={() => onPick(m)}>
                <div className="m-img"><img src={m.url} alt={m.alt} loading="lazy" /></div><div className="m-name">{m.name}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={onClose}>Annulla</button><button className="btn btn-primary" disabled={!sel} onClick={() => sel && onPick(sel)}>Seleziona</button></div>
      </div>
    </div>
  );
}
