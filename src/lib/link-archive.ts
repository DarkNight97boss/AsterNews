import 'server-only';
import { addRecord, findRecord, updateRecord } from './records';
import { urlKey } from './distribution';

/**
 * Link che invecchiano bene. A ogni controllo dei link: se la pagina è viva ci assicuriamo che l'Internet Archive ne abbia una copia
 * (e se non c'è la chiediamo); se è morta e la copia esiste, da quel momento il lettore viene mandato alla copia, con un'indicazione.
 */
let budget = 0;
export const resetArchiveBudget = (n = 25) => { budget = n; };
async function snapshotOf(url: string): Promise<string> { try { const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(8000) }); const j = await r.json() as { archived_snapshots?: { closest?: { available?: boolean; url?: string } } }; const s = j.archived_snapshots?.closest; return s?.available && s.url ? s.url.replace(/^http:/, 'https:') : ''; } catch { return ''; } }
export async function archiveStep(url: string, alive: boolean): Promise<'archived' | 'healed' | 'requested' | 'skipped'> {
  const id = urlKey(url); const rec = await findRecord<{ url: string; archived: string }>(id);
  if (rec?.data.archived) { const want = alive ? 'open' : 'done'; if (rec.status !== want) await updateRecord(id, { status: want }); return alive ? 'skipped' : 'healed'; }
  if (budget <= 0) return 'skipped'; budget--; const archived = await snapshotOf(url);
  if (archived) { await addRecord('archive', { id, status: alive ? 'open' : 'done', data: { url, archived } }); return alive ? 'archived' : 'healed'; }
  if (alive) { fetch(`https://web.archive.org/save/${url}`, { method: 'GET', signal: AbortSignal.timeout(4000) }).catch(() => {}); await addRecord('archive', { id, status: 'open', data: { url, archived: '' } }); return 'requested'; }
  return 'skipped';
}
