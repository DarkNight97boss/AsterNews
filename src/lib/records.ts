import 'server-only';
import { all, get, run } from './db';

/**
 * Archivio generico dei «contributi»: promesse ai lettori, previsioni, domande aperte, repliche, grazie, cambi d'idea,
 * evidenziazioni, libro degli ospiti, competenze, taccuino di quartiere, oggetti smarriti, voti dell'assemblea…
 * Una sola tabella con tipo, riferimento (di solito l'articolo), stato e dati JSON: ogni funzione nuova non richiede schema nuovo.
 */
export type RecordStatus = 'open' | 'pending' | 'approved' | 'done' | 'rejected';
export interface Rec<T = Record<string, unknown>> { id: string; kind: string; ref: string; owner: string; status: RecordStatus; data: T; dueAt: string | null; createdAt: string; updatedAt: string }
type Row = Record<string, unknown>;
const toRec = <T>(r: Row): Rec<T> => { let data = {} as T; try { data = (typeof r.data === 'string' ? JSON.parse(r.data) : r.data ?? {}) as T; } catch { /* dati illeggibili */ } return { id: String(r.id), kind: String(r.kind), ref: String(r.ref ?? ''), owner: String(r.owner ?? ''), status: (r.status as RecordStatus) ?? 'open', data, dueAt: (r.due_at as string | null) ?? null, createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? '') }; };
const rid = (k: string) => `${k.slice(0, 3)}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export async function addRecord<T>(kind: string, input: { ref?: string; owner?: string; status?: RecordStatus; data: T; dueAt?: string | null; id?: string }): Promise<Rec<T>> {
  const now = new Date().toISOString(); const id = input.id ?? rid(kind);
  await run('INSERT INTO records (id, kind, ref, owner, status, data, due_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET status = excluded.status, data = excluded.data, due_at = excluded.due_at, updated_at = excluded.updated_at', [id, kind, input.ref ?? '', input.owner ?? '', input.status ?? 'open', JSON.stringify(input.data ?? {}), input.dueAt ?? null, now, now]);
  return { id, kind, ref: input.ref ?? '', owner: input.owner ?? '', status: input.status ?? 'open', data: input.data, dueAt: input.dueAt ?? null, createdAt: now, updatedAt: now };
}
export async function listRecords<T = Record<string, unknown>>(kind: string, f: { ref?: string; owner?: string; status?: RecordStatus | RecordStatus[]; dueBefore?: string; limit?: number; order?: 'new' | 'old' | 'due' } = {}): Promise<Rec<T>[]> {
  const w = ['kind = ?']; const p: unknown[] = [kind];
  if (f.ref !== undefined) { w.push('ref = ?'); p.push(f.ref); } if (f.owner !== undefined) { w.push('owner = ?'); p.push(f.owner); }
  if (f.status) { const s = Array.isArray(f.status) ? f.status : [f.status]; w.push(`status IN (${s.map(() => '?').join(',')})`); p.push(...s); }
  if (f.dueBefore) { w.push('due_at IS NOT NULL AND due_at <= ?'); p.push(f.dueBefore); }
  const order = f.order === 'old' ? 'created_at ASC' : f.order === 'due' ? 'due_at ASC' : 'created_at DESC';
  return ((await all(`SELECT * FROM records WHERE ${w.join(' AND ')} ORDER BY ${order} LIMIT ?`, [...p, f.limit ?? 200])) as Row[]).map((r) => toRec<T>(r));
}
export const findRecord = async <T = Record<string, unknown>>(id: string): Promise<Rec<T> | undefined> => { const r = (await get('SELECT * FROM records WHERE id = ?', [id])) as Row | undefined; return r ? toRec<T>(r) : undefined; };
export async function updateRecord<T>(id: string, patch: { status?: RecordStatus; data?: T; dueAt?: string | null }): Promise<void> {
  const cur = await findRecord<T>(id); if (!cur) return;
  await run('UPDATE records SET status = ?, data = ?, due_at = ?, updated_at = ? WHERE id = ?', [patch.status ?? cur.status, JSON.stringify(patch.data ?? cur.data), patch.dueAt === undefined ? cur.dueAt : patch.dueAt, new Date().toISOString(), id]);
}
export async function deleteRecord(id: string): Promise<void> { await run('DELETE FROM records WHERE id = ?', [id]); }
export async function countRecords(kind: string, f: { ref?: string; status?: RecordStatus; owner?: string } = {}): Promise<number> {
  const w = ['kind = ?']; const p: unknown[] = [kind]; if (f.ref !== undefined) { w.push('ref = ?'); p.push(f.ref); } if (f.status) { w.push('status = ?'); p.push(f.status); } if (f.owner !== undefined) { w.push('owner = ?'); p.push(f.owner); }
  return Number(((await get(`SELECT COUNT(*) c FROM records WHERE ${w.join(' AND ')}`, p)) as { c: number }).c);
}
/** Conteggi per riferimento (es. quanti «grazie» per ogni paragrafo di un articolo). */
export async function countByRef(kind: string, refPrefix: string): Promise<Record<string, number>> { const rows = (await all("SELECT ref, COUNT(*) c FROM records WHERE kind = ? AND ref LIKE ? AND status IN ('open','approved','done') GROUP BY ref", [kind, `${refPrefix}%`])) as Row[]; return Object.fromEntries(rows.map((r) => [String(r.ref), Number(r.c)])); }
/** Contatore aggregato (una riga per chiave, non una per evento): per misure che non devono riempire il database. */
export async function bumpCounter(kind: string, key: string, ref = '', extra: Record<string, string> = {}): Promise<number> {
  const id = `${kind}_${key}`.slice(0, 160); const cur = await findRecord<{ n: number }>(id); const n = (cur?.data.n ?? 0) + 1;
  if (cur) await updateRecord(id, { data: { ...cur.data, ...extra, n } }); else await addRecord(kind, { id, ref, data: { ...extra, n } }); return n;
}
