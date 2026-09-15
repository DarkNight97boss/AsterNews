import 'server-only';
import { gzipSync, gunzipSync } from 'node:zlib';
import * as x from './repo-extra';
import { all, batch, exec, metaGet, metaSet } from './db';
import { uid } from './utils';

/** Tabelle incluse nel backup, nell'ordine di ripristino. */
export const BACKUP_TABLES = ['meta', 'settings', 'categories', 'tags', 'users', 'zones', 'articles', 'article_tags', 'comments', 'media', 'subscribers', 'events', 'reports', 'readers', 'redirects', 'editions', 'polls', 'article_revisions', 'article_notes', 'activity'];
const SKIP_COLS = new Set(['search']); // colonna generata

/** Esporta tutto il database come JSON (a blocchi, senza caricare tutto in memoria). */
export async function* exportChunks(): AsyncGenerator<string> {
  yield `{"format":"aster-backup","version":2,"exportedAt":"${new Date().toISOString()}","tables":{`;
  let firstTable = true;
  for (const t of BACKUP_TABLES) {
    yield `${firstTable ? '' : ','}"${t}":[`; firstTable = false;
    let first = true;
    for await (const rows of x.iterateTable(t, 300)) {
      for (const r of rows) { const clean: Record<string, unknown> = {}; for (const [k, v] of Object.entries(r)) if (!SKIP_COLS.has(k)) clean[k] = v; yield `${first ? '' : ','}${JSON.stringify(clean)}`; first = false; }
    }
    yield ']';
  }
  yield '}}';
}
export async function exportString(): Promise<string> { let s = ''; for await (const c of exportChunks()) s += c; return s; }

/** Crea un backup compresso e lo salva nello storage (se disponibile) o nel database come ultimo backup. */
export async function createBackup(note = 'manuale'): Promise<{ id: string; size: number; url: string }> {
  const json = await exportString();
  const gz = gzipSync(Buffer.from(json));
  const id = uid('bk'); const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let url = '';
  try {
    const { resolveProvider } = await import('./storage');
    const provider = await resolveProvider();
    if (provider === 'supabase' || provider === 'vercel-blob') {
      const { put } = await import('@vercel/blob').catch(() => ({ put: null }));
      if (provider === 'vercel-blob' && put) { const b = await put(`backup/aster-${stamp}.json.gz`, gz, { access: 'public', contentType: 'application/gzip', addRandomSuffix: false }); url = b.url; }
      else if (provider === 'supabase') {
        const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
        await fetch(`${base}/storage/v1/bucket`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'backup', name: 'backup', public: false }) }).catch(() => {});
        const r = await fetch(`${base}/storage/v1/object/backup/aster-${stamp}.json.gz`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/gzip', 'x-upsert': 'true' }, body: new Uint8Array(gz) });
        if (r.ok) url = `supabase://backup/aster-${stamp}.json.gz`;
      }
    }
  } catch { /* storage non disponibile: resta nel database */ }
  if (!url) await metaSet('last_backup', gz.toString('base64'));
  await x.insertBackup({ id, createdAt: new Date().toISOString(), size: gz.length, url, note });
  return { id, size: gz.length, url };
}
export async function pruneBackups(keep: number): Promise<void> {
  const list = await x.listBackups(200);
  for (const b of list.slice(Math.max(1, keep))) { await x.deleteBackupRow(b.id); if (b.url.startsWith('https://')) { try { const { del } = await import('@vercel/blob'); await del(b.url); } catch { /* ignore */ } } }
}
export async function lastDbBackup(): Promise<Buffer | null> { const b = await metaGet('last_backup'); return b ? Buffer.from(b, 'base64') : null; }

/** Ripristina un backup JSON (anche compresso): svuota le tabelle incluse e reinserisce le righe. Le chiavi meta di installazione restano. */
export async function restoreBackup(data: Buffer): Promise<{ tables: number; rows: number }> {
  const txt = data[0] === 0x1f && data[1] === 0x8b ? gunzipSync(data).toString() : data.toString();
  const parsed = JSON.parse(txt) as { format?: string; tables?: Record<string, Record<string, unknown>[]> };
  if (parsed.format !== 'aster-backup' || !parsed.tables) throw new Error('File non riconosciuto: serve un backup di ASTER News.');
  const keepMeta = ['installed', 'auth_secret', 'vapid_public', 'vapid_private', 'site_url'];
  let rows = 0; let tables = 0;
  for (const t of BACKUP_TABLES) {
    const list = parsed.tables[t]; if (!Array.isArray(list)) continue;
    tables++;
    if (t === 'meta') { for (const r of list) if (!keepMeta.includes(String(r.key))) await metaSet(String(r.key), String(r.value ?? '')); continue; }
    await exec(`DELETE FROM ${t}`);
    for (let i = 0; i < list.length; i += 200) {
      const chunk = list.slice(i, i + 200);
      await batch(chunk.map((r) => { const cols = Object.keys(r).filter((k) => !SKIP_COLS.has(k)); return { sql: `INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')}) ON CONFLICT DO NOTHING`, args: cols.map((c) => (typeof r[c] === 'object' && r[c] !== null ? JSON.stringify(r[c]) : r[c])) }; }));
      rows += chunk.length;
    }
  }
  await all('SELECT 1');
  return { tables, rows };
}
