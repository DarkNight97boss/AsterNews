import 'server-only';
import { createHash } from 'node:crypto';
import { DEFAULT_VIDEO, type MediaItem, type VideoSettings } from './models';
import { getSettings } from './queries';
import { uploadImage, storageSettings } from './storage';

/** Strumenti immagine lato server (sharp): ritagli per formato, ritocchi base, filigrana, impronta per i duplicati, banca immagini, video hosting. */
export const RATIOS: Record<string, { w: number; h: number; label: string }> = { '16:9': { w: 16, h: 9, label: 'Orizzontale 16:9 (Facebook, YouTube)' }, '1:1': { w: 1, h: 1, label: 'Quadrato 1:1 (Instagram)' }, '9:16': { w: 9, h: 16, label: 'Verticale 9:16 (Stories, Reels)' }, '3:2': { w: 3, h: 2, label: 'Classico 3:2 (card del sito)' }, '4:5': { w: 4, h: 5, label: 'Ritratto 4:5 (feed Instagram)' } };
export const fileHash = (buf: Buffer): string => createHash('sha1').update(buf).digest('hex');

/** Legge il file di un media: dal disco se è un upload locale (/uploads/…), altrimenti via HTTP. */
export async function fetchBuffer(url: string): Promise<{ buf: Buffer; mime: string }> {
  if (url.startsWith('/')) {
    const { readFile } = await import('node:fs/promises'); const { join } = await import('node:path');
    try { const buf = await readFile(join(process.cwd(), 'public', url.split('?')[0])); return { buf, mime: url.endsWith('.png') ? 'image/png' : url.endsWith('.webp') ? 'image/webp' : 'image/jpeg' }; } catch { /* prova via HTTP */ }
    const { siteUrl } = await import('./site-url'); url = siteUrl() + url;
  }
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) }); if (!r.ok) throw new Error(`Immagine non scaricabile (${r.status})`);
  return { buf: Buffer.from(await r.arrayBuffer()), mime: r.headers.get('content-type')?.split(';')[0] || 'image/jpeg' };
}
/** Ritaglio automatico in un formato, centrato sul punto focale scelto in libreria. */
export async function cropToRatio(m: MediaItem, ratio: string): Promise<{ buf: Buffer; width: number; height: number }> {
  const r = RATIOS[ratio]; if (!r) throw new Error('Formato sconosciuto');
  const sharp = (await import('sharp')).default; const { buf } = await fetchBuffer(m.url);
  const img = sharp(buf, { failOn: 'none' }).rotate(); const meta = await img.metadata(); const W = meta.width ?? 0, H = meta.height ?? 0; if (!W || !H) throw new Error('Dimensioni non leggibili');
  let cw = W, ch = Math.round((W * r.h) / r.w); if (ch > H) { ch = H; cw = Math.round((H * r.w) / r.h); }
  const fx = (m.focalX ?? 0.5) * W, fy = (m.focalY ?? 0.5) * H;
  const left = Math.max(0, Math.min(W - cw, Math.round(fx - cw / 2))), top = Math.max(0, Math.min(H - ch, Math.round(fy - ch / 2)));
  const out = await img.extract({ left, top, width: cw, height: ch }).toBuffer();
  return { buf: out, width: cw, height: ch };
}
export interface EditOps { rotate?: 0 | 90 | 180 | 270; flip?: boolean; brightness?: number; contrast?: number; saturation?: number; grayscale?: boolean; text?: string; textPos?: 'top' | 'bottom' }
/** Ritocchi base non distruttivi: il risultato diventa un nuovo file. */
export async function applyEdits(m: MediaItem, ops: EditOps): Promise<Buffer> {
  const sharp = (await import('sharp')).default; const { buf } = await fetchBuffer(m.url);
  let img = sharp(buf, { failOn: 'none' }).rotate(); if (ops.rotate) img = img.rotate(ops.rotate); if (ops.flip) img = img.flop();
  const mod: Record<string, number> = {}; if (ops.brightness && ops.brightness !== 1) mod.brightness = ops.brightness; if (ops.saturation && ops.saturation !== 1) mod.saturation = ops.saturation; if (Object.keys(mod).length) img = img.modulate(mod);
  if (ops.contrast && ops.contrast !== 1) img = img.linear(ops.contrast, 128 * (1 - ops.contrast)); if (ops.grayscale) img = img.grayscale();
  if (ops.text?.trim()) { const meta = await img.toBuffer({ resolveWithObject: true }); const W = meta.info.width, H = meta.info.height; const fs = Math.max(18, Math.round(W / 22)); const text = ops.text.trim().slice(0, 90).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)); const bandH = Math.round(fs * 2.2); const y = ops.textPos === 'top' ? 0 : H - bandH; const svg = `<svg width="${W}" height="${H}"><rect x="0" y="${y}" width="${W}" height="${bandH}" fill="rgba(0,0,0,0.55)"/><text x="${Math.round(fs * 0.8)}" y="${y + Math.round(bandH * 0.66)}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="#fff">${text}</text></svg>`; img = sharp(meta.data).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]); }
  return img.toBuffer();
}
/** Filigrana con il nome della testata in basso a destra (foto esclusive). */
export async function watermark(buf: Buffer, label: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default; const img = sharp(buf, { failOn: 'none' }).rotate(); const meta = await img.metadata(); const W = meta.width ?? 1200, H = meta.height ?? 800;
  const fs = Math.max(14, Math.round(W / 34)); const text = label.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)); const tw = Math.round(text.length * fs * 0.62 + fs);
  const svg = `<svg width="${W}" height="${H}"><rect x="${W - tw - fs}" y="${H - fs * 2.4}" width="${tw + fs * 0.6}" height="${fs * 1.8}" rx="4" fill="rgba(0,0,0,0.45)"/><text x="${W - tw - fs * 0.7}" y="${H - fs * 1.1}" font-family="Helvetica, Arial, sans-serif" font-size="${fs}" font-weight="700" fill="rgba(255,255,255,0.9)">${text}</text></svg>`;
  return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).toBuffer();
}
/** Salva un buffer derivato come nuovo file della libreria (ridimensionato e con varianti come ogni upload). */
export async function storeDerived(buf: Buffer, baseName: string, suffix: string) { return uploadImage(buf, `${baseName.replace(/\.[^.]+$/, '')}-${suffix}.webp`, 'image/webp'); }

// ---------------- Banca immagini ----------------
export interface StockImage { id: string; provider: 'unsplash' | 'pexels'; thumb: string; full: string; width: number; height: number; author: string; authorUrl: string; credit: string; alt: string }
export async function searchStock(q: string, provider: 'unsplash' | 'pexels', page = 1): Promise<StockImage[]> {
  const s = (await getSettings()).storage ?? { provider: 'auto', bucket: 'media', maxWidth: 2000 }; const key = provider === 'unsplash' ? s.unsplashKey : s.pexelsKey;
  if (!key) throw new Error(`Chiave API ${provider === 'unsplash' ? 'Unsplash' : 'Pexels'} mancante (Impostazioni → Servizi → Banca immagini).`);
  if (provider === 'unsplash') {
    const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&page=${page}&lang=it`, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(15_000) }); const j = await r.json(); if (!r.ok) throw new Error(j.errors?.[0] ?? 'Errore Unsplash');
    return (j.results as Record<string, unknown>[]).map((p) => { const u = p.user as Record<string, string>; const urls = p.urls as Record<string, string>; return { id: String(p.id), provider: 'unsplash' as const, thumb: urls.small, full: urls.regular, width: Number(p.width), height: Number(p.height), author: u.name, authorUrl: `${u.links ? (u.links as unknown as Record<string, string>).html : 'https://unsplash.com/@' + u.username}?utm_source=asternews&utm_medium=referral`, credit: `Foto di ${u.name} su Unsplash`, alt: String(p.alt_description ?? p.description ?? q) }; });
  }
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=24&page=${page}&locale=it-IT`, { headers: { Authorization: key }, signal: AbortSignal.timeout(15_000) }); const j = await r.json(); if (!r.ok) throw new Error(j.error ?? 'Errore Pexels');
  return (j.photos as Record<string, unknown>[]).map((p) => { const src = p.src as Record<string, string>; return { id: String(p.id), provider: 'pexels' as const, thumb: src.medium, full: src.large2x, width: Number(p.width), height: Number(p.height), author: String(p.photographer), authorUrl: String(p.photographer_url), credit: `Foto di ${p.photographer} da Pexels`, alt: String(p.alt ?? q) }; });
}

// ---------------- Video hosting (Cloudflare Stream / Mux) ----------------
export async function videoSettings(): Promise<VideoSettings> { return { ...DEFAULT_VIDEO, ...((await getSettings()).video ?? {}) }; }
/** URL di caricamento diretto dal browser: il file non passa dal nostro server. */
export async function createVideoUpload(filename: string): Promise<{ uploadUrl: string; method: 'POST' | 'PUT'; id: string; provider: 'cloudflare' | 'mux' }> {
  const v = await videoSettings();
  if (v.provider === 'cloudflare') {
    if (!v.cfAccountId || !v.cfApiToken) throw new Error('Cloudflare Stream: servono Account ID e API Token.');
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${v.cfAccountId}/stream/direct_upload`, { method: 'POST', headers: { Authorization: `Bearer ${v.cfApiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ maxDurationSeconds: 3600, meta: { name: filename } }) }); const j = await r.json();
    if (!j.success) throw new Error(j.errors?.[0]?.message ?? 'Errore Cloudflare'); return { uploadUrl: j.result.uploadURL, method: 'POST', id: j.result.uid, provider: 'cloudflare' };
  }
  if (v.provider === 'mux') {
    if (!v.muxTokenId || !v.muxTokenSecret) throw new Error('Mux: servono Token ID e Token Secret.');
    const r = await fetch('https://api.mux.com/video/v1/uploads', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${v.muxTokenId}:${v.muxTokenSecret}`).toString('base64'), 'Content-Type': 'application/json' }, body: JSON.stringify({ cors_origin: '*', new_asset_settings: { playback_policy: ['public'], passthrough: filename } }) }); const j = await r.json();
    if (!r.ok) throw new Error(j.error?.messages?.join(', ') ?? 'Errore Mux'); return { uploadUrl: j.data.url, method: 'PUT', id: j.data.id, provider: 'mux' };
  }
  throw new Error('Video hosting non configurato (Impostazioni → Servizi → Video).');
}
/** Dopo il caricamento: URL del player (iframe) e stato di elaborazione. */
export async function videoStatus(provider: 'cloudflare' | 'mux', id: string): Promise<{ ready: boolean; playerUrl: string; thumb: string }> {
  const v = await videoSettings();
  if (provider === 'cloudflare') { const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${v.cfAccountId}/stream/${id}`, { headers: { Authorization: `Bearer ${v.cfApiToken}` } }); const j = await r.json(); const ready = j.result?.readyToStream === true; const code = v.cfCustomerCode || (j.result?.preview ? String(j.result.preview).match(/customer-([a-z0-9]+)\./)?.[1] ?? '' : ''); return { ready, playerUrl: code ? `https://customer-${code}.cloudflarestream.com/${id}/iframe` : '', thumb: j.result?.thumbnail ?? '' }; }
  const r = await fetch(`https://api.mux.com/video/v1/uploads/${id}`, { headers: { Authorization: 'Basic ' + Buffer.from(`${v.muxTokenId}:${v.muxTokenSecret}`).toString('base64') } }); const j = await r.json(); const assetId = j.data?.asset_id; if (!assetId) return { ready: false, playerUrl: '', thumb: '' };
  const a = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, { headers: { Authorization: 'Basic ' + Buffer.from(`${v.muxTokenId}:${v.muxTokenSecret}`).toString('base64') } }); const aj = await a.json(); const pb = aj.data?.playback_ids?.[0]?.id; return { ready: aj.data?.status === 'ready' && !!pb, playerUrl: pb ? `https://player.mux.com/${pb}` : '', thumb: pb ? `https://image.mux.com/${pb}/thumbnail.jpg?time=1` : '' };
}
export async function maxUploadWidth(): Promise<number> { return (await storageSettings()).maxWidth || 2000; }
