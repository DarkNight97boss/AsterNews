import 'server-only';
import path from 'node:path';
import fs from 'node:fs';
import { buildSeed } from './seed';

/**
 * Archivio su PostgreSQL.
 * - Produzione (Vercel + Supabase): POSTGRES_URL / DATABASE_URL con postgres.js (pooler, prepare: false).
 * - Sviluppo locale senza database: PGlite (Postgres embedded) salvato in data/pg. Stesso SQL.
 */
export interface Stmt { sql: string; args?: unknown[] }
interface Driver { all(sql: string, args: unknown[]): Promise<Record<string, unknown>[]>; exec(sql: string): Promise<void>; tx(stmts: Stmt[]): Promise<void>; close(): Promise<void> }
type G = typeof globalThis & { __asterDriver?: Driver; __asterReady?: Promise<void> };
const g = globalThis as G;

/** Converte i segnaposto ? in $1, $2, … (fuori dalle stringhe SQL). */
export function toPg(sql: string): string {
  let i = 0; let out = ''; let inStr = false;
  for (const ch of sql) {
    if (ch === "'") inStr = !inStr;
    if (ch === '?' && !inStr) out += `$${++i}`; else out += ch;
  }
  return out;
}
const norm = (v: unknown) => (v === undefined ? null : v);

async function makeDriver(): Promise<Driver> {
  // Pooler in transaction mode (Supabase porta 6543: centinaia di client) — la connessione in session mode è limitata a pool_size client.
  // DATABASE_URL, se presente, vince su tutto.
  const url = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL_NON_POOLING].find((u) => u && !u.includes('[SENSITIVE]'));
  if (url) {
    // node-postgres: protocollo semplice e affidabile con i pooler in transaction mode (Supavisor/pgbouncer), timeout nativi per query.
    const { Pool } = await import('pg');
    // sslmode=require nell'URL farebbe verificare la catena di certificati (Supabase usa una CA propria): si toglie e si passa ssl esplicito.
    const connectionString = url.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');
    const open = () => new Pool({ connectionString, ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false }, max: isServerless() ? 4 : 10, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000, query_timeout: 20_000, allowExitOnIdle: true });
    let pool = open();
    pool.on('error', () => {}); // errori sui client inattivi (chiusi dal pooler): niente crash del processo
    // In serverless l'istanza viene "congelata" tra una richiesta e l'altra: una connessione tenuta aperta può risultare morta al risveglio.
    // Se una query non risponde, il pool viene sostituito e si riprova; errori di connessione vengono ritentati.
    const QUERY_MS = 25_000, TX_MS = 60_000;
    const withTimeout = <T,>(run: () => Promise<T>, ms: number): Promise<T> => new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new DbTimeout(`Database non risponde da ${ms / 1000}s`)), ms);
      run().then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });
    const guarded = async <T,>(run: () => Promise<T>, ms: number): Promise<T> => {
      for (let attempt = 0; ; attempt++) {
        try { return await withTimeout(run, ms); }
        catch (e) {
          if (attempt >= 2 || (!(e instanceof DbTimeout) && !isDeadConnection(e))) throw e;
          if (e instanceof DbTimeout) { const dead = pool; pool = open(); pool.on('error', () => {}); void dead.end().catch(() => {}); }
          else await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
    };
    return {
      all: (q, args) => guarded(async () => (await pool.query(toPg(q), args.map(norm))).rows as Record<string, unknown>[], QUERY_MS),
      exec: (q) => guarded(async () => { await pool.query(q); }, QUERY_MS),
      tx: (stmts) => guarded(async () => {
        const c = await pool.connect();
        try { await c.query('BEGIN'); for (const s of stmts) await c.query(toPg(s.sql), (s.args ?? []).map(norm)); await c.query('COMMIT'); }
        catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
        finally { c.release(); }
      }, TX_MS),
      close: async () => { await pool.end(); },
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR ?? writableDir(path.join(process.cwd(), 'data', 'pg'));
  const db = dir ? new PGlite(dir) : new PGlite(); // senza cartella scrivibile (serverless) resta in memoria; pg_trgm solo su Postgres remoto (in locale c'è il ripiego JS)
  return {
    all: async (q, args) => (await db.query(toPg(q), args.map(norm))).rows as Record<string, unknown>[],
    exec: async (q) => { await db.exec(q); },
    tx: async (stmts) => { await db.transaction(async (t) => { for (const s of stmts) await t.query(toPg(s.sql), (s.args ?? []).map(norm)); }); },
    close: async () => { await db.close(); }, // PGlite scrive su disco solo con una chiusura pulita: gli script devono chiamare closeDb()
  };
}

class DbTimeout extends Error {}
/** Errori di rete/connessione per cui ha senso riaprire il pool e riprovare (mai errori SQL). */
function isDeadConnection(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return ['CONNECTION_CLOSED', 'CONNECTION_ENDED', 'CONNECTION_DESTROYED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED', '57P01', '57014', '08006', '08003', 'XX000'].includes(err?.code ?? '') || /Connection terminated|timeout exceeded when trying to connect|Query read timeout|max clients reached/i.test(err?.message ?? '');
}
function isDuplicate(e: unknown): boolean {
  const err = e as { code?: string; message?: string };
  return err?.code === '23505' || err?.code === '42P07' || /duplicate key|already exists/i.test(err?.message ?? '');
}

/** Unisce INSERT consecutivi con lo stesso testo SQL in un unico INSERT multi-riga (max ~60.000 parametri per statement). */
export function mergeInserts(stmts: Stmt[]): Stmt[] {
  const re = /^(\s*INSERT INTO \S+ \([^)]*\)\s*VALUES\s*)(\((?:\s*\?\s*,)*\s*\?\s*\))([\s\S]*)$/i;
  const out: Stmt[] = [];
  let cur: { prefix: string; tuple: string; suffix: string; tuples: number; args: unknown[] } | null = null;
  const flush = () => { if (cur) { out.push({ sql: cur.prefix + Array.from({ length: cur.tuples }, () => cur!.tuple).join(',') + cur.suffix, args: cur.args }); cur = null; } };
  for (const st of stmts) {
    const m = st.sql.match(re);
    if (!m) { flush(); out.push(st); continue; }
    const [, prefix, tuple, suffix] = m; const args = st.args ?? [];
    if (cur && cur.prefix === prefix && cur.suffix === suffix && cur.args.length + args.length <= 60000) { cur.tuples++; cur.args.push(...args); }
    else { flush(); cur = { prefix, tuple, suffix, tuples: 1, args: [...args] }; }
  }
  flush();
  return out;
}

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'standard', color TEXT, description TEXT, ord INTEGER DEFAULT 0, show_in_menu INTEGER DEFAULT 1, show_on_home INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, role TEXT NOT NULL, avatar TEXT, bio TEXT, active INTEGER DEFAULT 1, created_at TEXT);
CREATE TABLE IF NOT EXISTS zones (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'zona');
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, kicker TEXT DEFAULT '', title TEXT NOT NULL, subtitle TEXT DEFAULT '', excerpt TEXT DEFAULT '', content TEXT DEFAULT '',
  cover_image TEXT DEFAULT '', cover_caption TEXT DEFAULT '', category_id TEXT, author_id TEXT, zone_id TEXT DEFAULT '', address TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft', format TEXT NOT NULL DEFAULT 'standard', video_url TEXT DEFAULT '', gallery TEXT DEFAULT '[]', live_updates TEXT DEFAULT '[]', live_active INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0, breaking INTEGER DEFAULT 0, sponsored INTEGER DEFAULT 0, allow_comments INTEGER DEFAULT 1, seo TEXT DEFAULT '{}', tag_ids TEXT DEFAULT '[]',
  views INTEGER DEFAULT 0, published_at TEXT, scheduled_at TEXT, created_at TEXT, updated_at TEXT, seo_score INTEGER, seo_report TEXT, legacy_url TEXT, wp_id TEXT,
  search_text TEXT DEFAULT '', search tsvector GENERATED ALWAYS AS (to_tsvector('italian', coalesce(search_text, ''))) STORED
);
CREATE INDEX IF NOT EXISTS idx_articles_status_pub ON articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_cat_pub ON articles(category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles(author_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_zone ON articles(zone_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_views ON articles(status, views DESC);
CREATE INDEX IF NOT EXISTS idx_articles_updated ON articles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_legacy ON articles(legacy_url);
CREATE INDEX IF NOT EXISTS idx_articles_wp ON articles(wp_id);
CREATE INDEX IF NOT EXISTS idx_articles_format ON articles(format, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON articles(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_articles_search ON articles USING GIN(search);
CREATE TABLE IF NOT EXISTS article_tags (article_id TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY (article_id, tag_id));
CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag_id, article_id);
CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, article_id TEXT NOT NULL, author_name TEXT, email TEXT, body TEXT, status TEXT NOT NULL, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_comments_article ON comments(article_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status, created_at DESC);
CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT, url TEXT NOT NULL, alt TEXT DEFAULT '', type TEXT DEFAULT 'image', size INTEGER DEFAULT 0, uploaded_by TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_media_created ON media(created_at DESC);
CREATE TABLE IF NOT EXISTS subscribers (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, created_at TEXT);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS activity (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, target TEXT, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, description TEXT DEFAULT '', type TEXT NOT NULL, date_from TEXT NOT NULL, date_to TEXT, time_info TEXT DEFAULT '', place TEXT DEFAULT '', address TEXT DEFAULT '', zone_id TEXT DEFAULT '', price TEXT DEFAULT '', free INTEGER DEFAULT 0, image TEXT DEFAULT '', rating INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'published', submitted_by TEXT DEFAULT '', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_events_status_date ON events(status, date_from, date_to);
CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, name TEXT, email TEXT, zone_id TEXT DEFAULT '', subject TEXT, body TEXT, image TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'new', reply TEXT DEFAULT '', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'staff', created_at TEXT, last_seen TEXT, expires_at TEXT, user_agent TEXT DEFAULT '', ip TEXT DEFAULT '', revoked INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked);
CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, kind TEXT NOT NULL, subject TEXT NOT NULL, payload TEXT DEFAULT '', expires_at TEXT NOT NULL, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_tokens_subject ON tokens(kind, subject);
CREATE TABLE IF NOT EXISTS article_revisions (id TEXT PRIMARY KEY, article_id TEXT NOT NULL, user_id TEXT, note TEXT DEFAULT '', data TEXT NOT NULL, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_revisions_article ON article_revisions(article_id, created_at DESC);
CREATE TABLE IF NOT EXISTS article_notes (id TEXT PRIMARY KEY, article_id TEXT NOT NULL, user_id TEXT, kind TEXT NOT NULL DEFAULT 'note', body TEXT NOT NULL, resolved INTEGER DEFAULT 0, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_notes_article ON article_notes(article_id, created_at DESC);
CREATE TABLE IF NOT EXISTS article_locks (article_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS autosaves (article_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS polls (id TEXT PRIMARY KEY, article_id TEXT DEFAULT '', question TEXT NOT NULL, options TEXT NOT NULL DEFAULT '[]', votes TEXT NOT NULL DEFAULT '[]', created_at TEXT);
CREATE TABLE IF NOT EXISTS push_subscriptions (id TEXT PRIMARY KEY, endpoint TEXT UNIQUE NOT NULL, keys TEXT NOT NULL, topics TEXT DEFAULT '[]', created_at TEXT, failures INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, hour INTEGER NOT NULL, path TEXT NOT NULL, article_id TEXT DEFAULT '', source TEXT NOT NULL DEFAULT 'diretto', count INTEGER DEFAULT 0, read_ms BIGINT DEFAULT 0, PRIMARY KEY (day, hour, path, source));
CREATE INDEX IF NOT EXISTS idx_hits_day ON hits(day, hour);
CREATE INDEX IF NOT EXISTS idx_hits_article ON hits(article_id, day);
CREATE TABLE IF NOT EXISTS readers (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT DEFAULT '', password_hash TEXT, verified INTEGER DEFAULT 0, premium INTEGER DEFAULT 0, premium_until TEXT, stripe_customer TEXT DEFAULT '', banned INTEGER DEFAULT 0, created_at TEXT, last_login TEXT);
CREATE TABLE IF NOT EXISTS comment_flags (comment_id TEXT NOT NULL, voter TEXT NOT NULL, created_at TEXT, PRIMARY KEY (comment_id, voter));
CREATE TABLE IF NOT EXISTS redirects (id TEXT PRIMARY KEY, from_path TEXT UNIQUE NOT NULL, to_path TEXT NOT NULL, code INTEGER DEFAULT 301, hits INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS not_found_log (path TEXT PRIMARY KEY, hits INTEGER DEFAULT 1, referer TEXT DEFAULT '', first_seen TEXT, last_seen TEXT);
CREATE INDEX IF NOT EXISTS idx_notfound_hits ON not_found_log(hits DESC);
CREATE TABLE IF NOT EXISTS editions (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, domain TEXT UNIQUE, tagline TEXT DEFAULT '', zone_id TEXT DEFAULT '', category_ids TEXT DEFAULT '[]', theme TEXT DEFAULT '{}', logo TEXT DEFAULT '', active INTEGER DEFAULT 1, created_at TEXT);
CREATE TABLE IF NOT EXISTS error_log (id TEXT PRIMARY KEY, digest TEXT, message TEXT, stack TEXT DEFAULT '', path TEXT DEFAULT '', count INTEGER DEFAULT 1, first_seen TEXT, last_seen TEXT);
CREATE INDEX IF NOT EXISTS idx_errors_last ON error_log(last_seen DESC);
CREATE TABLE IF NOT EXISTS newsletter_sends (id TEXT PRIMARY KEY, subject TEXT, kind TEXT DEFAULT 'digest', recipients INTEGER DEFAULT 0, sent_at TEXT, status TEXT DEFAULT 'sent', message TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS backups (id TEXT PRIMARY KEY, created_at TEXT, size INTEGER DEFAULT 0, url TEXT DEFAULT '', note TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS social_posts (id TEXT PRIMARY KEY, article_id TEXT DEFAULT '', network TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', text TEXT DEFAULT '', image TEXT DEFAULT '', url TEXT DEFAULT '', scheduled_at TEXT, sent_at TEXT, result TEXT DEFAULT '', created_by TEXT DEFAULT '', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_social_status ON social_posts(status, scheduled_at);
CREATE TABLE IF NOT EXISTS newsletters (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', kind TEXT NOT NULL DEFAULT 'digest', config TEXT DEFAULT '{}', blocks TEXT DEFAULT '[]', schedule TEXT DEFAULT '{}', enabled INTEGER DEFAULT 1, is_default INTEGER DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS subscriber_lists (subscriber_id TEXT NOT NULL, list_id TEXT NOT NULL, created_at TEXT, PRIMARY KEY (subscriber_id, list_id));
CREATE INDEX IF NOT EXISTS idx_sublists_list ON subscriber_lists(list_id);
CREATE TABLE IF NOT EXISTS newsletter_events (id TEXT PRIMARY KEY, send_id TEXT NOT NULL, subscriber_id TEXT NOT NULL, kind TEXT NOT NULL, url TEXT DEFAULT '', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_nlevents_send ON newsletter_events(send_id, kind);
CREATE TABLE IF NOT EXISTS ads (id TEXT PRIMARY KEY, slot TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'image', image TEXT DEFAULT '', url TEXT DEFAULT '', html TEXT DEFAULT '', label TEXT DEFAULT '', start_at TEXT, end_at TEXT, weight INTEGER DEFAULT 1, impressions INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_ads_slot ON ads(slot, active);
CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, body TEXT DEFAULT '', image TEXT DEFAULT '', category TEXT DEFAULT '', price TEXT DEFAULT '', contact_name TEXT DEFAULT '', contact_email TEXT DEFAULT '', contact_phone TEXT DEFAULT '', zone_id TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', paid INTEGER DEFAULT 0, amount REAL DEFAULT 0, expires_at TEXT, reader_id TEXT DEFAULT '', created_at TEXT, published_at TEXT, extra TEXT DEFAULT '{}');
CREATE INDEX IF NOT EXISTS idx_listings_kind ON listings(kind, status, published_at DESC);
CREATE TABLE IF NOT EXISTS pages (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, content TEXT DEFAULT '', excerpt TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'draft', template TEXT DEFAULT 'standard', cover_image TEXT DEFAULT '', seo TEXT DEFAULT '{}', show_in_menu INTEGER DEFAULT 0, menu_order INTEGER DEFAULT 0, author_id TEXT DEFAULT '', created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS reader_bookmarks (reader_id TEXT NOT NULL, article_id TEXT NOT NULL, created_at TEXT, PRIMARY KEY (reader_id, article_id));
CREATE TABLE IF NOT EXISTS comment_votes (comment_id TEXT NOT NULL, voter TEXT NOT NULL, value INTEGER DEFAULT 1, PRIMARY KEY (comment_id, voter));
CREATE TABLE IF NOT EXISTS donations (id TEXT PRIMARY KEY, amount REAL NOT NULL, name TEXT DEFAULT '', email TEXT DEFAULT '', message TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', reader_id TEXT DEFAULT '', created_at TEXT, paid_at TEXT);
CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, name TEXT NOT NULL, prefix TEXT NOT NULL, key_hash TEXT NOT NULL, scopes TEXT DEFAULT '["read"]', active INTEGER DEFAULT 1, calls INTEGER DEFAULT 0, last_used TEXT, created_by TEXT DEFAULT '', created_at TEXT);
CREATE TABLE IF NOT EXISTS broken_links (id TEXT PRIMARY KEY, article_id TEXT NOT NULL, url TEXT NOT NULL, status INTEGER DEFAULT 0, error TEXT DEFAULT '', checked_at TEXT, fixed INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_broken_article ON broken_links(article_id);
CREATE TABLE IF NOT EXISTS tag_follows (id TEXT PRIMARY KEY, tag_id TEXT NOT NULL, email TEXT NOT NULL, reader_id TEXT DEFAULT '', token TEXT NOT NULL, created_at TEXT, UNIQUE (tag_id, email));
CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, name TEXT DEFAULT '', email TEXT NOT NULL, qty INTEGER DEFAULT 1, code TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'pending', amount REAL DEFAULT 0, created_at TEXT, used_at TEXT);
CREATE TABLE IF NOT EXISTS ai_usage (id TEXT PRIMARY KEY, user_id TEXT DEFAULT '', action TEXT DEFAULT '', model TEXT DEFAULT '', input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, cost REAL DEFAULT 0, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at DESC);
CREATE TABLE IF NOT EXISTS security_log (id TEXT PRIMARY KEY, kind TEXT NOT NULL, email TEXT DEFAULT '', user_id TEXT DEFAULT '', ip TEXT DEFAULT '', ua TEXT DEFAULT '', country TEXT DEFAULT '', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_security_created ON security_log(created_at DESC);
CREATE TABLE IF NOT EXISTS vitals (id TEXT PRIMARY KEY, path TEXT NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL, device TEXT DEFAULT 'desktop', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_vitals_created ON vitals(created_at DESC);
CREATE TABLE IF NOT EXISTS consents (id TEXT PRIMARY KEY, choice TEXT NOT NULL, version INTEGER DEFAULT 1, ip_hash TEXT DEFAULT '', ua TEXT DEFAULT '', created_at TEXT);
CREATE TABLE IF NOT EXISTS article_embeddings (article_id TEXT PRIMARY KEY, vector TEXT NOT NULL, updated_at TEXT);
CREATE TABLE IF NOT EXISTS gift_codes (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, email TEXT NOT NULL, months INTEGER DEFAULT 1, message TEXT DEFAULT '', from_reader TEXT DEFAULT '', redeemed_by TEXT DEFAULT '', created_at TEXT, redeemed_at TEXT);
CREATE TABLE IF NOT EXISTS quiz_results (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL, article_id TEXT DEFAULT '', who TEXT NOT NULL, name TEXT DEFAULT '', score INTEGER DEFAULT 0, total INTEGER DEFAULT 0, created_at TEXT, UNIQUE (quiz_id, who));
CREATE TABLE IF NOT EXISTS contacts (id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT DEFAULT '', org TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', notes TEXT DEFAULT '', tags TEXT DEFAULT '', created_by TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS snippets (id TEXT PRIMARY KEY, name TEXT NOT NULL, html TEXT DEFAULT '', updated_at TEXT);
CREATE TABLE IF NOT EXISTS pagespeed_runs (id TEXT PRIMARY KEY, url TEXT NOT NULL, strategy TEXT DEFAULT 'mobile', performance INTEGER DEFAULT 0, accessibility INTEGER DEFAULT 0, best_practices INTEGER DEFAULT 0, seo INTEGER DEFAULT 0, lcp REAL DEFAULT 0, cls REAL DEFAULT 0, tbt REAL DEFAULT 0, fcp REAL DEFAULT 0, si REAL DEFAULT 0, opportunities TEXT DEFAULT '[]', created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_pagespeed_url ON pagespeed_runs(url, strategy, created_at DESC);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT DEFAULT 'info', text TEXT NOT NULL, url TEXT DEFAULT '', read INTEGER DEFAULT 0, created_at TEXT);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE TABLE IF NOT EXISTS import_jobs (id TEXT PRIMARY KEY, source TEXT NOT NULL, status TEXT NOT NULL, options TEXT DEFAULT '{}', file TEXT, total INTEGER DEFAULT 0, processed INTEGER DEFAULT 0, imported INTEGER DEFAULT 0, skipped INTEGER DEFAULT 0, errors TEXT DEFAULT '[]', message TEXT DEFAULT '', cursor_pos TEXT DEFAULT '', created_at TEXT, updated_at TEXT);
`;

/** Colonne aggiunte dopo la prima versione: idempotenti, eseguite a ogni avvio. */
export const MIGRATIONS = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS socials TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS long_bio TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deadline TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS premium INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS edition_id TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS faq TEXT DEFAULT '[]';
ALTER TABLE activity ADD COLUMN IF NOT EXISTS ip TEXT DEFAULT '';
ALTER TABLE activity ADD COLUMN IF NOT EXISTS details TEXT DEFAULT '';
ALTER TABLE activity ADD COLUMN IF NOT EXISTS article_id TEXT DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_activity_article ON activity(article_id, created_at DESC);
ALTER TABLE media ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS path TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS variants TEXT DEFAULT '{}';
ALTER TABLE media ADD COLUMN IF NOT EXISTS focal_x REAL DEFAULT 0.5;
ALTER TABLE media ADD COLUMN IF NOT EXISTS focal_y REAL DEFAULT 0.5;
ALTER TABLE media ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS credit TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS license TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS rights_until TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS hash TEXT DEFAULT '';
ALTER TABLE media ADD COLUMN IF NOT EXISTS exclusive INTEGER DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS lat REAL DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS lon REAL DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS token TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS confirmed_at TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'sito';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS reader_id TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id TEXT DEFAULT '';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS flags INTEGER DEFAULT 0;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE newsletter_sends ADD COLUMN IF NOT EXISTS list_id TEXT DEFAULT '';
ALTER TABLE newsletter_sends ADD COLUMN IF NOT EXISTS opens INTEGER DEFAULT 0;
ALTER TABLE newsletter_sends ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE readers ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT '';
ALTER TABLE readers ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS social_text TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS deleted_at TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS coauthor_ids TEXT DEFAULT '[]';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS byline TEXT DEFAULT '';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS extra TEXT DEFAULT '{}';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS extra TEXT DEFAULT '{}';
ALTER TABLE article_notes ADD COLUMN IF NOT EXISTS quote TEXT DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_price REAL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_total INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_sold INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_articles_deleted ON articles(deleted_at);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS staff INTEGER DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS priority REAL DEFAULT 0;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS ai_note TEXT DEFAULT '';
ALTER TABLE readers ADD COLUMN IF NOT EXISTS prefs TEXT DEFAULT '{}';
`;

/** Vero solo dentro una funzione serverless (Vercel/Lambda), non quando VERCEL=1 arriva da un .env.local scaricato con `vercel env pull`. */
export function isServerless(): boolean { return !!(process.env.VERCEL_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY); }
function writableDir(dir: string): string | undefined {
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return dir; } catch { return undefined; }
}
export function isRemote(): boolean { return [process.env.DATABASE_URL, process.env.POSTGRES_URL_NON_POOLING, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL].some((u) => u && !u.includes('[SENSITIVE]')); }

async function driver(): Promise<Driver> {
  if (!g.__asterDriver) g.__asterDriver = await makeDriver();
  return g.__asterDriver;
}
/** Connessione pronta: schema creato e dati demo inseriti se il database è vuoto. */
export async function ready(): Promise<Driver> {
  const d = await driver();
  if (!g.__asterReady) {
    g.__asterReady = (async () => {
      // Più istanze serverless possono partire insieme: CREATE ... IF NOT EXISTS concorrenti possono collidere, si riprova una volta.
      try { await d.exec(SCHEMA); } catch (e) { if (!isDuplicate(e)) throw e; await new Promise((r) => setTimeout(r, 500)); await d.exec(SCHEMA); }
      // Le migrazioni si eseguono una per una: se una fallisce (colonna già presente, indice duplicato) le successive devono comunque girare.
      // Registro delle migrazioni: ogni istruzione gira una sola volta (impronta del testo) e lascia traccia di data ed esito.
      await d.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, stmt TEXT NOT NULL, ok INTEGER DEFAULT 1, error TEXT DEFAULT '', applied_at TEXT)");
      const done = new Set((await d.all('SELECT id FROM schema_migrations WHERE ok = 1', [])).map((r) => String(r.id)));
      const fp = (t: string) => { let h = 5381; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0; return 'm' + h.toString(36) + t.length.toString(36); };
      for (const stmt of MIGRATIONS.split(/;\s*\n/).map((x) => x.trim()).filter(Boolean)) {
        const id = fp(stmt); if (done.has(id)) continue; let ok = 1; let error = '';
        try { await d.exec(stmt); } catch (e) { if (!isDuplicate(e)) { ok = 0; error = (e as Error).message.slice(0, 300); console.error('[db] migrazione fallita:', stmt.slice(0, 80), error); } }
        try { await d.all('INSERT INTO schema_migrations (id, stmt, ok, error, applied_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET ok = excluded.ok, error = excluded.error, applied_at = excluded.applied_at', [id, stmt.slice(0, 400), ok, error, new Date().toISOString()]); } catch { /* il registro non deve mai bloccare l'avvio */ }
      }
      if (isRemote()) { try { await d.exec('CREATE EXTENSION IF NOT EXISTS pg_trgm'); } catch { /* estensione non disponibile: la ricerca "forse cercavi" usa il ripiego in JavaScript */ } }
      const su = await d.all("SELECT value FROM meta WHERE key = 'site_url'", []);
      if (su.length) (await import('./site-url')).setSiteUrlOverride(String(su[0].value));
      // I dati (demo o minimi) vengono inseriti dall'installazione guidata (/setup), non più automaticamente.
    })().catch((e) => { g.__asterReady = undefined; throw e; });
  }
  await g.__asterReady;
  return d;
}
export async function all<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> { return (await (await ready()).all(sql, args)) as unknown as T[]; }
export async function get<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T | undefined> { return (await all<T>(sql, args))[0]; }
export async function run(sql: string, args: unknown[] = []): Promise<void> { await (await ready()).all(sql, args); }
export async function batch(stmts: Stmt[]): Promise<void> { if (stmts.length) await (await ready()).tx(stmts); }
export async function exec(sql: string): Promise<void> { await (await ready()).exec(sql); }
/** Chiude la connessione (obbligatorio negli script CLI: PGlite salva i dati su disco solo alla chiusura). */
export async function closeDb(): Promise<void> { const d = g.__asterDriver ? await g.__asterDriver : undefined; g.__asterDriver = undefined; g.__asterReady = undefined; if (d) await d.close(); }
/** Ripristina i dati demo (svuota tutte le tabelle e reinserisce il seed). */
export async function resetDb(): Promise<void> {
  await exec('TRUNCATE articles, article_tags, categories, tags, users, zones, comments, media, subscribers, settings, activity, events, reports, import_jobs;');
  const { insertSeed } = await import('./repo');
  await insertSeed(buildSeed());
  await run("INSERT INTO meta (key, value) VALUES ('seeded', ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [new Date().toISOString()]);
}
/** Inserisce i dati demo se il database è vuoto (usato dall'installazione guidata): un'unica transazione multi-riga. */
export async function seedDemo(): Promise<boolean> {
  const d = await ready();
  const { seedStatements } = await import('./repo');
  const stmts = mergeInserts(seedStatements(buildSeed()));
  try { await d.tx([{ sql: "INSERT INTO meta (key, value) VALUES ('seeded', ?)", args: [new Date().toISOString()] }, ...stmts]); return true; }
  catch (e) { if (!isDuplicate(e)) throw e; return false; }
}
export async function metaGet(key: string): Promise<string | null> { const r = await get<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]); return r?.value ?? null; }
export async function metaSet(key: string, value: string): Promise<void> { await run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]); }
