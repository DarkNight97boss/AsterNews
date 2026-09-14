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
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;
  if (url && !url.includes('[SENSITIVE]')) {
    const postgres = (await import('postgres')).default;
    const sql = postgres(url, { prepare: false, ssl: url.includes('localhost') ? undefined : 'require', max: isServerless() ? 3 : 8, idle_timeout: 20, connect_timeout: 15, transform: { undefined: null } });
    return {
      all: async (q, args) => (await sql.unsafe(toPg(q), args.map(norm) as never)) as unknown as Record<string, unknown>[],
      exec: async (q) => { await sql.unsafe(q); },
      tx: async (stmts) => { await sql.begin(async (t) => { for (const s of stmts) await t.unsafe(toPg(s.sql), (s.args ?? []).map(norm) as never); }); },
      close: async () => { await sql.end({ timeout: 5 }); },
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR ?? writableDir(path.join(process.cwd(), 'data', 'pg'));
  const db = dir ? new PGlite(dir) : new PGlite(); // senza cartella scrivibile (serverless) resta in memoria
  return {
    all: async (q, args) => (await db.query(toPg(q), args.map(norm))).rows as Record<string, unknown>[],
    exec: async (q) => { await db.exec(q); },
    tx: async (stmts) => { await db.transaction(async (t) => { for (const s of stmts) await t.query(toPg(s.sql), (s.args ?? []).map(norm)); }); },
    close: async () => { await db.close(); }, // PGlite scrive su disco solo con una chiusura pulita: gli script devono chiamare closeDb()
  };
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
CREATE TABLE IF NOT EXISTS import_jobs (id TEXT PRIMARY KEY, source TEXT NOT NULL, status TEXT NOT NULL, options TEXT DEFAULT '{}', file TEXT, total INTEGER DEFAULT 0, processed INTEGER DEFAULT 0, imported INTEGER DEFAULT 0, skipped INTEGER DEFAULT 0, errors TEXT DEFAULT '[]', message TEXT DEFAULT '', cursor_pos TEXT DEFAULT '', created_at TEXT, updated_at TEXT);
`;

/** Vero solo dentro una funzione serverless (Vercel/Lambda), non quando VERCEL=1 arriva da un .env.local scaricato con `vercel env pull`. */
export function isServerless(): boolean { return !!(process.env.VERCEL_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT || process.env.NETLIFY); }
function writableDir(dir: string): string | undefined {
  try { fs.mkdirSync(dir, { recursive: true }); fs.accessSync(dir, fs.constants.W_OK); return dir; } catch { return undefined; }
}
export function isRemote(): boolean { const u = process.env.DATABASE_URL ?? process.env.POSTGRES_URL; return !!u && !u.includes('[SENSITIVE]'); }

async function driver(): Promise<Driver> {
  if (!g.__asterDriver) g.__asterDriver = await makeDriver();
  return g.__asterDriver;
}
/** Connessione pronta: schema creato e dati demo inseriti se il database è vuoto. */
export async function ready(): Promise<Driver> {
  const d = await driver();
  if (!g.__asterReady) {
    g.__asterReady = (async () => {
      await d.exec(SCHEMA);
      const r = await d.all("SELECT value FROM meta WHERE key = 'seeded'", []);
      if (!r.length) {
        const { seedStatements } = await import('./repo');
        const stmts = seedStatements(buildSeed()); // eseguito direttamente sul driver: siamo dentro l'inizializzazione, ready() non è ancora risolto
        for (let i = 0; i < stmts.length; i += 400) await d.tx(stmts.slice(i, i + 400));
        await d.all("INSERT INTO meta (key, value) VALUES ('seeded', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [new Date().toISOString()]);
      }
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
}
