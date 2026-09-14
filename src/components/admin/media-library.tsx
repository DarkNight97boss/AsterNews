'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addMediaAction, deleteMediaAction, updateMediaAction } from '@/lib/actions';
import { MediaItem, User } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { readFileAsDataUrl } from './media-picker';

const fileSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export function MediaLibrary({ media, users }: { media: MediaItem[]; users: User[] }) {
  const router = useRouter();
  const [q, setQ] = useState(''); const [url, setUrl] = useState(''); const [over, setOver] = useState(false); const [sel, setSel] = useState<MediaItem | null>(null);
  const [, start] = useTransition();
  const addFiles = (files: File[]) => start(async () => {
    for (const f of files.filter((x) => x.type.startsWith('image/'))) {
      if (f.size > 2 * 1024 * 1024) { toast.error(`${f.name}: massimo 2 MB nella demo locale.`); continue; }
      const r = await addMediaAction({ name: f.name, url: await readFileAsDataUrl(f), alt: f.name.replace(/\.[^.]+$/, ''), size: f.size });
      if (r) toast.success(`${f.name} caricato.`);
    }
    router.refresh();
  });
  const filtered = media.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="page-title"><div><h1>Libreria media</h1><p>{media.length} file</p></div></div>
      <label className={`dropzone ${over ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)); }}>
        <b>Trascina qui le immagini</b> oppure clicca per selezionarle<br /><span className="help">JPG, PNG, WebP, GIF</span>
        <input type="file" accept="image/*" multiple onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
      </label>
      <div className="filters">
        <input className="input grow" placeholder="Cerca..." value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input grow" placeholder="Aggiungi da URL (https://...)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button className="btn btn-outline" disabled={!url} onClick={() => start(async () => { await addMediaAction({ name: url.split('/').pop() || 'immagine', url, alt: '', size: 0 }); setUrl(''); toast.success('Immagine aggiunta.'); router.refresh(); })}>Aggiungi URL</button>
      </div>
      <div className="admin-grid-2">
        <div className="media-grid">
          {filtered.map((m) => <div key={m.id} className={`media-item ${sel?.id === m.id ? 'selected' : ''}`} onClick={() => setSel({ ...m })}><div className="m-img"><img src={m.url} alt={m.alt} loading="lazy" /></div><div className="m-name">{m.name}</div></div>)}
          {filtered.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}><h3>Nessun file</h3></div>}
        </div>
        <div>
          {sel ? (
            <div className="panel" style={{ position: 'sticky', top: 80 }}>
              <div className="panel-title">Dettagli file</div>
              <img src={sel.url} alt="" style={{ borderRadius: 4, marginBottom: 12, maxHeight: 220, objectFit: 'contain', width: '100%', background: 'var(--gray-100)' }} />
              <div className="field"><label>Nome</label><input className="input" value={sel.name} onChange={(e) => setSel({ ...sel, name: e.target.value })} /></div>
              <div className="field"><label>Testo alternativo (alt)</label><input className="input" value={sel.alt} onChange={(e) => setSel({ ...sel, alt: e.target.value })} /></div>
              <div className="field"><label>URL</label><input className="input" value={sel.url.slice(0, 80)} readOnly onClick={() => navigator.clipboard?.writeText(sel.url).then(() => toast.info('URL copiato'))} title="Clicca per copiare" /></div>
              <div className="help">Caricato da {users.find((u) => u.id === sel.uploadedBy)?.name} il {formatDate(sel.createdAt)} · {fileSize(sel.size)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <ActionButton className="btn btn-primary btn-sm" action={() => updateMediaAction(sel)}>Salva</ActionButton>
                <ActionButton className="btn btn-danger btn-sm" confirm="Eliminare questo file?" action={() => deleteMediaAction(sel.id)} onDone={() => setSel(null)}>Elimina</ActionButton>
              </div>
            </div>
          ) : <div className="panel help">Seleziona un file per vederne i dettagli.</div>}
        </div>
      </div>
    </>
  );
}
