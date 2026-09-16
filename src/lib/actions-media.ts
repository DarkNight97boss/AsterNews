'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from './auth';
import * as repo from './repo';
import type { MediaItem } from './models';
import { getSettings } from './queries';
import { uid } from './utils';
import type { ActionResult } from './actions';

const now = () => new Date().toISOString();
async function derive(m: MediaItem, buf: Buffer, suffix: string, by: string, extra: Partial<MediaItem> = {}): Promise<MediaItem> {
  const { storeDerived, fileHash } = await import('./media-tools'); const f = await storeDerived(buf, m.name, suffix);
  const item: MediaItem = { ...m, id: uid('m'), name: `${m.name.replace(/\.[^.]+$/, '')}-${suffix}.webp`, url: f.url, size: f.size, provider: f.provider, path: f.path, width: f.width, height: f.height, variants: f.variants, focalX: 0.5, focalY: 0.5, uploadedBy: by, createdAt: now(), hash: fileHash(buf), deletedAt: null, ...extra };
  await repo.insertMedia(item); return item;
}
/** Ritaglio in un formato (16:9, 1:1, 9:16…) centrato sul punto focale: crea un nuovo file. */
export async function cropMediaAction(id: string, ratio: string): Promise<ActionResult & { item?: MediaItem }> {
  const me = await requirePermission('media.manage'); const m = await repo.findMedia(id); if (!m) return { ok: false, message: 'File non trovato.' };
  try { const { cropToRatio } = await import('./media-tools'); const r = await cropToRatio(m, ratio); const item = await derive(m, r.buf, ratio.replace(':', 'x'), me.id); revalidatePath('/admin/media'); return { ok: true, message: `Ritaglio ${ratio} salvato come nuovo file.`, item }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function editMediaAction(id: string, ops: import('./media-tools').EditOps): Promise<ActionResult & { item?: MediaItem }> {
  const me = await requirePermission('media.manage'); const m = await repo.findMedia(id); if (!m) return { ok: false, message: 'File non trovato.' };
  try { const { applyEdits } = await import('./media-tools'); const buf = await applyEdits(m, ops); const item = await derive(m, buf, 'mod', me.id); revalidatePath('/admin/media'); return { ok: true, message: 'Modifica salvata come nuovo file.', item }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function watermarkMediaAction(id: string): Promise<ActionResult & { item?: MediaItem }> {
  const me = await requirePermission('media.manage'); const m = await repo.findMedia(id); if (!m) return { ok: false, message: 'File non trovato.' };
  try { const { watermark } = await import('./media-tools'); const s = await getSettings(); const r = await fetch(m.url); const buf = await watermark(Buffer.from(await r.arrayBuffer()), `© ${s.siteName}`); const item = await derive(m, buf, 'wm', me.id, { exclusive: true }); revalidatePath('/admin/media'); return { ok: true, message: 'Versione con filigrana creata.', item }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
/** Metadati estesi: cartella, tag, credit, licenza, scadenza diritti, esclusiva. */
export async function updateMediaMetaAction(m: MediaItem): Promise<ActionResult> { await requirePermission('media.manage'); await repo.updateMediaRow(m); revalidatePath('/admin/media'); return { ok: true, message: 'Salvato.' }; }
export async function trashMediaAction(id: string, restore = false): Promise<ActionResult> { await requirePermission('media.manage'); await repo.setMediaDeleted(id, restore ? null : now()); revalidatePath('/admin/media'); return { ok: true, message: restore ? 'File ripristinato.' : 'File spostato nel cestino (30 giorni).' }; }
export async function emptyMediaTrashAction(): Promise<ActionResult> { await requirePermission('media.manage'); const n = await repo.purgeMediaTrash(0); revalidatePath('/admin/media'); return { ok: true, message: `${n} file eliminati definitivamente.` }; }
export async function findDuplicatesAction(): Promise<{ hash: string; items: MediaItem[] }[]> { await requirePermission('media.manage'); return repo.mediaDuplicates(); }
/** Ricalcola l'impronta e comprime i file pesanti (>400 KB) non ancora WebP: elimina i doppioni in eccesso su richiesta. */
export async function compressOldMediaAction(limit = 20): Promise<ActionResult> {
  const me = await requirePermission('media.manage'); const heavy = (await repo.listMedia(2000)).filter((m) => m.type === 'image' && m.size > 400 * 1024 && !/\.webp(\?|$)/i.test(m.url)).slice(0, limit);
  let done = 0, saved = 0; const { storeDerived } = await import('./media-tools');
  for (const m of heavy) { try { const r = await fetch(m.url, { signal: AbortSignal.timeout(20_000) }); if (!r.ok) continue; const buf = Buffer.from(await r.arrayBuffer()); const f = await storeDerived(buf, m.name, 'ott'); if (f.size < m.size) { await repo.updateMediaFile(m.id, { url: f.url, path: f.path, provider: f.provider, size: f.size, width: f.width, height: f.height, variants: f.variants }); saved += m.size - f.size; done++; } } catch { /* prossimo */ } }
  revalidatePath('/admin/media'); return { ok: true, message: done ? `${done} file compressi, risparmiati ${(saved / 1048576).toFixed(1)} MB.` : 'Nessun file pesante da comprimere.' };
}
// ---------------- Banca immagini ----------------
export async function searchStockAction(q: string, provider: 'unsplash' | 'pexels'): Promise<{ ok: boolean; message?: string; items?: import('./media-tools').StockImage[] }> {
  await requirePermission('media.manage'); try { const { searchStock } = await import('./media-tools'); return { ok: true, items: await searchStock(q, provider) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function importStockAction(img: import('./media-tools').StockImage): Promise<ActionResult & { item?: MediaItem }> {
  const me = await requirePermission('media.manage');
  try { const { importRemoteImage } = await import('./storage'); const f = await importRemoteImage(img.full); if (!f) return { ok: false, message: 'Immagine non scaricabile.' }; const item: MediaItem = { id: uid('m'), name: `${img.provider}-${img.id}.webp`, url: f.url, alt: img.alt.slice(0, 200), type: 'image', size: f.size, uploadedBy: me.id, createdAt: now(), provider: f.provider, path: f.path, width: f.width, height: f.height, variants: f.variants, focalX: 0.5, focalY: 0.5, credit: img.credit, license: img.provider === 'unsplash' ? 'Unsplash License' : 'Pexels License', folder: 'banca-immagini', tags: img.provider }; await repo.insertMedia(item); revalidatePath('/admin/media'); return { ok: true, message: `Importata. Credit: ${img.credit}`, item }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
// ---------------- Video ----------------
export async function videoUploadAction(filename: string): Promise<{ ok: boolean; message?: string; uploadUrl?: string; method?: 'POST' | 'PUT'; id?: string; provider?: 'cloudflare' | 'mux' }> {
  await requirePermission('media.manage'); try { const { createVideoUpload } = await import('./media-tools'); return { ok: true, ...(await createVideoUpload(filename)) }; } catch (e) { return { ok: false, message: (e as Error).message }; }
}
export async function videoReadyAction(provider: 'cloudflare' | 'mux', id: string, name: string): Promise<ActionResult & { item?: MediaItem }> {
  const me = await requirePermission('media.manage'); const { videoStatus } = await import('./media-tools'); const st = await videoStatus(provider, id);
  if (!st.ready || !st.playerUrl) return { ok: false, message: 'Video in elaborazione: riprova tra qualche secondo.' };
  const existing = (await repo.listMedia(500)).find((m) => m.url === st.playerUrl); if (existing) return { ok: true, message: 'Video pronto.', item: existing };
  const item: MediaItem = { id: uid('m'), name, url: st.playerUrl, alt: name, type: 'video', size: 0, uploadedBy: me.id, createdAt: now(), provider, path: id, width: 0, height: 0, variants: st.thumb ? { poster: st.thumb } : {}, focalX: 0.5, focalY: 0.5, folder: 'video' };
  await repo.insertMedia(item); revalidatePath('/admin/media'); return { ok: true, message: 'Video pronto e aggiunto alla libreria.', item };
}
