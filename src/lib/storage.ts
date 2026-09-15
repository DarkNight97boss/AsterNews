import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DEFAULT_STORAGE, MediaItem, StorageSettings } from './models';
import { getSettings } from './queries';
import { isServerless } from './db';

export type Provider = 'supabase' | 'vercel-blob' | 'local' | 'db';
export interface StoredFile { url: string; path: string; provider: Provider; width: number; height: number; variants: Record<string, string>; size: number; mime: string }
const VARIANT_WIDTHS = [480, 960, 1600];

export async function storageSettings(): Promise<StorageSettings> { return { ...DEFAULT_STORAGE, ...((await getSettings()).storage ?? {}) }; }
const supabaseKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
export async function resolveProvider(): Promise<Provider> {
  const s = await storageSettings();
  const has = { supabase: !!(supabaseUrl() && supabaseKey()), blob: !!process.env.BLOB_READ_WRITE_TOKEN };
  if (s.provider === 'supabase' && has.supabase) return 'supabase';
  if (s.provider === 'vercel-blob' && has.blob) return 'vercel-blob';
  if (s.provider === 'db') return 'db';
  if (s.provider === 'local' && !isServerless()) return 'local';
  if (has.supabase) return 'supabase';
  if (has.blob) return 'vercel-blob';
  return isServerless() ? 'db' : 'local';
}
export async function storageLabel(): Promise<string> { const p = await resolveProvider(); return p === 'supabase' ? 'Supabase Storage' : p === 'vercel-blob' ? 'Vercel Blob' : p === 'local' ? 'cartella locale public/uploads' : 'database (data URL)'; }

// ---------------- Scrittura sul provider ----------------
let bucketReady = false;
async function ensureBucket(bucket: string): Promise<void> {
  if (bucketReady) return;
  const r = await fetch(`${supabaseUrl()}/storage/v1/bucket`, { method: 'POST', headers: { Authorization: `Bearer ${supabaseKey()}`, apikey: supabaseKey(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 52428800 }) });
  if (!r.ok && r.status !== 409 && r.status !== 400) throw new Error(`Supabase Storage: impossibile creare il bucket (${r.status})`);
  bucketReady = true;
}
async function putObject(provider: Provider, key: string, data: Buffer, mime: string): Promise<string> {
  if (provider === 'supabase') {
    const bucket = (await storageSettings()).bucket || 'media';
    await ensureBucket(bucket);
    const r = await fetch(`${supabaseUrl()}/storage/v1/object/${bucket}/${key}`, { method: 'POST', headers: { Authorization: `Bearer ${supabaseKey()}`, apikey: supabaseKey(), 'Content-Type': mime, 'x-upsert': 'true', 'cache-control': 'public, max-age=31536000, immutable' }, body: new Uint8Array(data) });
    if (!r.ok) throw new Error(`Supabase Storage: caricamento fallito (${r.status} ${(await r.text()).slice(0, 120)})`);
    return `${supabaseUrl()}/storage/v1/object/public/${bucket}/${key}`;
  }
  if (provider === 'vercel-blob') {
    const { put } = await import('@vercel/blob');
    const b = await put(key, data, { access: 'public', contentType: mime, addRandomSuffix: false, cacheControlMaxAge: 31536000 });
    return b.url;
  }
  if (provider === 'local') {
    const file = path.join(process.cwd(), 'public', 'uploads', key);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    return `/uploads/${key}`;
  }
  return `data:${mime};base64,${data.toString('base64')}`;
}
async function deleteObject(provider: Provider, key: string, url: string): Promise<void> {
  try {
    if (provider === 'supabase') { const bucket = (await storageSettings()).bucket || 'media'; await fetch(`${supabaseUrl()}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: { Authorization: `Bearer ${supabaseKey()}`, apikey: supabaseKey(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [key] }) }); }
    else if (provider === 'vercel-blob') { const { del } = await import('@vercel/blob'); await del(url); }
    else if (provider === 'local') { const file = path.join(process.cwd(), 'public', 'uploads', key); if (fs.existsSync(file)) fs.unlinkSync(file); }
  } catch { /* la cancellazione del file non deve bloccare quella del record */ }
}

// ---------------- Elaborazione immagini ----------------
const safeName = (name: string) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'immagine';

/** Carica un'immagine: ridimensiona alla larghezza massima, converte in WebP, genera le varianti (480/960/1600) e restituisce URL e metadati. */
export async function uploadImage(buf: Buffer, filename: string, mime: string): Promise<StoredFile> {
  const provider = await resolveProvider();
  const { maxWidth } = await storageSettings();
  const day = new Date(); const prefix = `${day.getFullYear()}/${String(day.getMonth() + 1).padStart(2, '0')}`;
  const hash = createHash('md5').update(buf).digest('hex').slice(0, 10);
  const base = `${prefix}/${safeName(filename)}-${hash}`;
  const isRaster = /^image\/(jpeg|png|webp|avif|tiff|gif)$/.test(mime) && mime !== 'image/gif';
  if (!isRaster || provider === 'db') {
    // GIF animate, SVG e modalità database: file originale senza elaborazione
    const ext = mime === 'image/svg+xml' ? 'svg' : mime.split('/')[1] || 'bin';
    const key = `${base}.${ext}`;
    const url = await putObject(provider, key, buf, mime);
    let width = 0, height = 0;
    try { const sharp = (await import('sharp')).default; const m = await sharp(buf).metadata(); width = m.width ?? 0; height = m.height ?? 0; } catch { /* metadati non disponibili */ }
    return { url, path: key, provider, width, height, variants: {}, size: buf.length, mime };
  }
  const sharp = (await import('sharp')).default;
  const img = sharp(buf, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  const w0 = meta.width ?? 0; const h0 = meta.height ?? 0;
  const targetW = Math.min(w0 || maxWidth, maxWidth || 2000);
  const main = await img.clone().resize({ width: targetW, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const url = await putObject(provider, `${base}.webp`, main.data, 'image/webp');
  const variants: Record<string, string> = {};
  await Promise.all(VARIANT_WIDTHS.filter((w) => w < targetW).map(async (w) => {
    const v = await img.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    variants[String(w)] = await putObject(provider, `${base}-${w}.webp`, v, 'image/webp');
  }));
  return { url, path: `${base}.webp`, provider, width: main.info.width, height: main.info.height, variants, size: main.info.size ?? main.data.length, mime: 'image/webp' };
}
export async function deleteStoredMedia(m: MediaItem): Promise<void> {
  if (!m.provider || !m.path) return;
  const p = m.provider as Provider;
  await deleteObject(p, m.path, m.url);
  await Promise.all(Object.entries(m.variants ?? {}).map(([w, url]) => deleteObject(p, m.path!.replace(/\.webp$/, `-${w}.webp`), url)));
}
/** Scarica un'immagine remota e la salva nello storage (usato dall'importazione WordPress). */
export async function importRemoteImage(src: string): Promise<StoredFile | null> {
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 ASTERNews-import' } });
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') ?? 'image/jpeg').split(';')[0];
    if (!mime.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 40 * 1024 * 1024) return null;
    return await uploadImage(buf, decodeURIComponent(new URL(src).pathname.split('/').pop() || 'immagine'), mime);
  } catch { return null; }
}
/** Suggerisce un testo alternativo a partire dal nome file o dal titolo dell'articolo. */
export function suggestAlt(filename: string, context = ''): string {
  const fromName = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b(img|dsc|image|foto|photo|screenshot|whatsapp)\b/gi, '').replace(/\d{6,}/g, '').replace(/\s+/g, ' ').trim();
  if (fromName.length > 6 && /[a-zà-ú]{3,}/i.test(fromName)) return fromName.charAt(0).toUpperCase() + fromName.slice(1);
  return context.slice(0, 120);
}
