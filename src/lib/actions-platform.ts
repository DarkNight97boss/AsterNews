'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from './auth';
import { parseExif, reverseSearchLinks, type Exif } from './platform';
import { getSettings } from './queries';
import { addRecord, findRecord } from './records';
import * as repo from './repo';
import { slugify, uid } from './utils';
import type { ActionResult } from './actions';

export async function savePlatformSettingsAction(p: { peers: { name: string; url: string }[]; uiWords: Record<string, string>; byteBudgetKb: number }): Promise<ActionResult> { await requirePermission('settings.manage'); const s = await getSettings(); await repo.saveSettingsRow({ ...s, network: { peers: p.peers.filter((x) => /^https?:\/\//.test(x.url) && x.name.trim()).slice(0, 20).map((x) => ({ name: x.name.trim().slice(0, 60), url: x.url.trim().replace(/\/$/, '') })) }, uiWords: Object.fromEntries(Object.entries(p.uiWords).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim().slice(0, 40)])), platform: { ...(s.platform ?? {}), byteBudgetKb: Math.max(0, Math.min(5000, Math.round(p.byteBudgetKb || 0))) } }); revalidateTag('settings', 'max'); revalidatePath('/', 'layout'); return { ok: true, message: 'Impostazioni salvate.' }; }
export async function runPlatformAuditAction(): Promise<ActionResult> { await requirePermission('settings.manage'); const { platformAudit } = await import('./platform-data'); const r = await platformAudit(true); revalidatePath('/admin/piattaforma'); revalidatePath('/accessibilita'); return { ok: true, message: r || 'Niente da misurare.' }; }
/** Scambio articoli: importa come bozza un pezzo condivisibile di una testata della rete, con il credito in testa. */
export async function importPeerArticleAction(peerUrl: string, id: string): Promise<ActionResult & { articleId?: string }> {
  const u = await requirePermission('article.create'); const s = await getSettings(); const peer = (s.network?.peers ?? []).find((p) => p.url === peerUrl); if (!peer) return { ok: false, message: 'Testata non in rete.' };
  let feed: { site: string; articles: { id: string; title: string; subtitle: string; url: string; share: boolean; license?: string; content?: string; author?: string }[] }; try { feed = (await (await fetch(`${peer.url}/api/rete`, { cache: 'no-store' })).json()) as typeof feed; } catch { return { ok: false, message: 'Testata non raggiungibile.' }; }
  const a = feed.articles.find((x) => x.id === id); if (!a || !a.share || !a.content) return { ok: false, message: 'Articolo non condivisibile.' };
  const cats = await repo.listCategories(); const now = new Date().toISOString(); const nid = uid('a'); const credit = `<p class="credit"><em>Articolo di ${a.author ? a.author + ', ' : ''}<a href="${a.url}">${feed.site}</a>, ripubblicato con licenza ${a.license ?? 'CC BY 4.0'} nell'ambito della rete delle testate.</em></p>`;
  await repo.upsertArticle({ id: nid, slug: `${slugify(a.title).slice(0, 60)}-${nid.slice(-4)}`, title: a.title, subtitle: a.subtitle ?? '', kicker: feed.site, excerpt: '', content: credit + a.content, coverImage: '', coverCaption: '', videoUrl: '', liveUpdates: [], liveActive: false, sponsored: false, allowComments: true, categoryId: cats[0]?.id ?? '', tagIds: [], authorId: u.id, status: 'draft', createdAt: now, updatedAt: now, publishedAt: null, scheduledAt: null, views: 0, featured: false, breaking: false, premium: false, format: 'standard', seo: {}, gallery: [], relatedIds: [], byline: a.author ?? '', zoneId: '', address: '', extra: { fields: {}, sources: [{ name: feed.site, contact: a.url, note: 'Scambio articoli nella rete', verified: true }] } } as unknown as import('./models').Article);
  revalidatePath('/admin/articoli'); return { ok: true, message: 'Importato come bozza, con il credito in testa.', articleId: nid };
}
/** Verifica di un'immagine: EXIF, impronta, se è già nel nostro archivio, i link per la ricerca inversa. */
export async function checkImageAction(dataUrl: string, publicUrl: string): Promise<ActionResult & { exif?: Exif; hash?: string; known?: { id: string; name: string; createdAt: string; credit?: string } | null; links?: { name: string; url: string }[] }> {
  await requirePermission('media.manage'); const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/); if (!m && !publicUrl) return { ok: false, message: 'Serve un file o un indirizzo.' };
  let buf: Buffer; if (m) buf = Buffer.from(m[2], 'base64'); else { try { const r = await fetch(publicUrl, { headers: { 'User-Agent': 'AsterCheck/1.0' } }); buf = Buffer.from(await r.arrayBuffer()); } catch { return { ok: false, message: 'Immagine non scaricabile.' }; } }
  if (buf.length > 25 * 1024 * 1024) return { ok: false, message: 'Massimo 25 MB.' }; const { fileHash } = await import('./media-tools'); const hash = fileHash(buf); const exif = parseExif(new Uint8Array(buf));
  const known = (await repo.listMedia(2000, '')).find((x) => x.hash === hash); await addRecord('image-check', { id: `ic_${hash}`, ref: hash, status: 'done', data: { exif, known: !!known, url: publicUrl.slice(0, 300) } }).catch(() => {});
  return { ok: true, exif, hash, known: known ? { id: known.id, name: known.name, createdAt: known.createdAt, credit: known.credit } : null, links: publicUrl ? reverseSearchLinks(publicUrl) : [] };
}
export async function imageCheckNoteAction(hash: string, verdict: string, note: string): Promise<ActionResult> { const u = await requirePermission('media.manage'); const r = await findRecord<Record<string, unknown>>(`ic_${hash}`); if (!r) return { ok: false, message: 'Prima controlla l\'immagine.' }; await addRecord('image-check', { id: r.id, ref: hash, status: 'done', data: { ...r.data, verdict: verdict.slice(0, 40), note: note.slice(0, 1000), by: u.name, at: new Date().toISOString() } }); return { ok: true, message: 'Verifica registrata.' }; }
