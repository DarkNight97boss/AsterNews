import 'server-only';
import { findRecord, listRecords, type Rec } from './records';
import { CARD_KINDS, seriesStats, type Card, type Point } from './civic';
import { approvedOf } from './commons-data';

/** Letture per schede, serie e pagine civiche (fuori dai file 'use server'). */
type CardData = Omit<Card, 'id'>;
const toCard = (r: Rec<CardData>): Card => ({ id: r.id, kind: r.data.kind, slug: r.data.slug, title: r.data.title, fields: r.data.fields ?? {}, body: r.data.body ?? '', tagId: r.data.tagId ?? '', image: r.data.image ?? '' });
export async function listCards(kind?: string, limit = 500): Promise<Card[]> { const all = (await listRecords<CardData>('card', { status: 'approved', limit, order: 'old' })).map(toCard); return (kind ? all.filter((c) => c.kind === kind) : all).sort((a, b) => a.title.localeCompare(b.title, 'it')); }
export async function findCard(id: string): Promise<Card | null> { const r = await findRecord<CardData>(id); return r && r.kind === 'card' ? toCard(r) : null; }
export async function cardEvents(cardId: string) { return (await listRecords<{ date: string; text: string; image?: string; by?: string }>('card-event', { ref: cardId, limit: 200, order: 'old' })).map((r) => r.data).sort((a, b) => a.date.localeCompare(b.date)); }
export async function cardCommitments(cardId: string) { const [p, q] = await Promise.all([listRecords<{ text: string; who?: string; outcome?: string; note?: string }>('promise', { ref: cardId, order: 'due' }), listRecords<{ text: string; who?: string; outcome?: string; note?: string }>('prediction', { ref: cardId, order: 'due' })]); return [...p, ...q].sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')); }
export interface Series { key: string; label: string; unit: string; source: string; points: Point[]; updatedAt: string }
export async function listSeries(): Promise<Series[]> { return (await listRecords<Series>('series', { limit: 200, order: 'old' })).map((r) => ({ ...r.data, points: r.data.points ?? [] })); }
export async function findSeries(key: string): Promise<Series | null> { const r = await findRecord<Series>(`ser_${key}`); return r ? { ...r.data, points: r.data.points ?? [] } : null; }
export async function factchecksFor(articleId: string) { return (await listRecords<{ minute: string; claim: string; verdict: string; note: string; source: string }>('factcheck', { ref: articleId, limit: 300, order: 'old' })).map((r) => ({ id: r.id, ...r.data })); }
export const kindsWithCounts = async () => { const all = await listCards(); return Object.entries(CARD_KINDS).map(([kind, def]) => ({ kind, def, n: all.filter((c) => c.kind === kind).length })); };
export async function approvedContrib(kind: string, limit = 500) { return approvedOf(kind, { withDone: true, limit }); }
/** Cruscotto della città: ogni notte le serie fuori norma diventano una bozza per la redazione (una volta per dato anomalo). */
export async function civicDaily(): Promise<string> {
  const { listArticles, upsertArticle, listUsers } = await import('./repo'); const { getCategories } = await import('./queries'); const { addRecord } = await import('./records'); const { uid } = await import('./utils');
  const series = await listSeries(); let made = 0;
  for (const s of series) { const st = seriesStats(s.points); if (!st.anomaly || !st.last) continue; const markId = `anom_${s.key}_${st.last.d}`; if (await findRecord(markId)) continue;
    const admin = (await listUsers()).find((u) => u.active && u.role === 'admin'); const cats = await getCategories(); if (!admin || !cats.length) continue; const now = new Date().toISOString(); const id = uid('a'); const existing = await listArticles({ q: `Dato fuori norma: ${s.label}`, includeCircles: true }, 'created', 1); if (existing.length && existing[0].createdAt > new Date(Date.now() - 7 * 86_400_000).toISOString()) continue;
    await upsertArticle({ id, slug: `dato-fuori-norma-${s.key}-${st.last.d}`, kicker: 'Dati', title: `Dato fuori norma: ${s.label}`, subtitle: `${st.last.v}${s.unit ? ' ' + s.unit : ''} il ${st.last.d}, contro una media di ${st.mean}`, excerpt: '', content: `<p>Il valore di <b>${s.label}</b> rilevato il ${st.last.d} è <b>${st.last.v}${s.unit ? ' ' + s.unit : ''}</b>: la media delle rilevazioni precedenti è ${st.mean} (scarto ${st.sd}). È un dato da spiegare: cosa è successo? Fonte: ${s.source || 'n.d.'}.</p><p>[Bozza creata automaticamente dal cruscotto della città: verificare e completare prima di pubblicare]</p>`, coverImage: '', coverCaption: '', categoryId: cats[0].id, tagIds: [], authorId: admin.id, zoneId: '', address: '', status: 'draft', format: 'standard', videoUrl: '', gallery: [], liveUpdates: [], liveActive: false, featured: false, breaking: false, sponsored: false, allowComments: true, seo: { title: '', description: '', canonical: '', noIndex: false }, views: 0, publishedAt: null, scheduledAt: null, createdAt: now, updatedAt: now });
    await addRecord('series-anomaly', { id: markId, ref: s.key, data: { value: st.last.v, article: id } }); made++; }
  return made ? `${made} bozze create da dati fuori norma` : '';
}
