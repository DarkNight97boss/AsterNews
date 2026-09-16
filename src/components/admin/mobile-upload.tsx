'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { MediaItem } from '@/lib/models';
import { uploadFile } from './media-picker';

export function MobileUpload() {
  const [items, setItems] = useState<MediaItem[]>([]); const [busy, setBusy] = useState(''); const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null); const [note, setNote] = useState('');
  const locate = () => navigator.geolocation?.getCurrentPosition((p) => setGeo({ lat: p.coords.latitude, lon: p.coords.longitude }), () => setBusy('Posizione non disponibile'), { enableHighAccuracy: true, timeout: 8000 });
  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) { setBusy(`Carico ${f.name}…`); try { const m = await uploadFile(f, (pct) => setBusy(`${f.name}: ${pct}%`), { folder: 'dal-telefono', lat: geo?.lat, lon: geo?.lon, alt: note }); setItems((x) => [m, ...x]); } catch (e) { setBusy((e as Error).message); } }
    setBusy('');
  };
  return (
    <div className="mobile-upload">
      <h1>📱 Invia dal telefono</h1>
      <p className="help">Scatta o scegli le foto: vengono ottimizzate e salvate nella cartella «dal-telefono» con la posizione, pronte per l&apos;articolo.</p>
      <button type="button" className={`btn ${geo ? 'btn-success' : 'btn-outline'}`} onClick={locate}>{geo ? `📍 Posizione acquisita (${geo.lat.toFixed(3)}, ${geo.lon.toFixed(3)})` : '📍 Usa la mia posizione'}</button>
      <input className="input" placeholder="Didascalia / cosa si vede" value={note} onChange={(e) => setNote(e.target.value)} />
      <label className="btn btn-primary big">📷 Scatta una foto<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target.files)} /></label>
      <label className="btn btn-dark big">🖼 Scegli dalla galleria<input type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} /></label>
      {busy && <p className="help">{busy}</p>}
      {items.length > 0 && <><div className="media-grid">{items.map((m) => <div key={m.id} className="media-item"><div className="m-img"><img src={m.variants?.['360'] ?? m.url} alt={m.alt} /></div></div>)}</div><Link href={`/admin/scrivi?cover=${encodeURIComponent(items[0].url)}`} className="btn btn-primary big">✍️ Scrivi l&apos;articolo con questa foto</Link></>}
    </div>
  );
}
