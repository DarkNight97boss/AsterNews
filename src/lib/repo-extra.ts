import 'server-only';
import { all, get, run, batch } from './db';
import { Article, ArticleNote, BackupEntry, Edition, ErrorEntry, HitRow, NewsletterSend, NotFoundEntry, Poll, Reader, Redirect, Revision, Session, User } from './models';
import { rowToArticle, rowToUser } from './repo';

type Row = Record<string, unknown>;
const b = (v: unknown) => (v ? 1 : 0);
const pj = <T,>(s: unknown, fallback: T): T => { try { return s ? (JSON.parse(String(s)) as T) : fallback; } catch { return fallback; } };
const now = () => new Date().toISOString();

// ---------------- Credenziali, sessioni, token ----------------
export async function setPassword(userId: string, hash: string, mustChange = false): Promise<void> { await run('UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?', [hash, b(mustChange), userId]); }
export const passwordHashOf = async (userId: string): Promise<string | null> => ((await get('SELECT password_hash FROM users WHERE id = ?', [userId])) as Row | undefined)?.password_hash as string | null ?? null;
export async function setTotp(userId: string, secret: string | null, enabled: boolean): Promise<void> { await run('UPDATE users SET totp_secret = ?, totp_enabled = ? WHERE id = ?', [secret, b(enabled), userId]); }
export const totpSecretOf = async (userId: string): Promise<string | null> => ((await get('SELECT totp_secret FROM users WHERE id = ?', [userId])) as Row | undefined)?.totp_secret as string | null ?? null;
export async function touchLogin(userId: string): Promise<void> { await run('UPDATE users SET last_login = ? WHERE id = ?', [now(), userId]); }
export const countAdmins = async (): Promise<number> => Number((await get("SELECT COUNT(*) c FROM users WHERE role = 'admin' AND active = 1") as Row).c);
export const countUsersWithPassword = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM users WHERE password_hash IS NOT NULL') as Row).c);

const rowToSession = (r: Row): Session => ({ id: String(r.id), userId: String(r.user_id), kind: (r.kind as Session['kind']) ?? 'staff', createdAt: String(r.created_at ?? ''), lastSeen: String(r.last_seen ?? ''), expiresAt: String(r.expires_at ?? ''), userAgent: String(r.user_agent ?? ''), ip: String(r.ip ?? ''), revoked: !!r.revoked });
export async function insertSession(s: Session): Promise<void> { await run('INSERT INTO sessions (id, user_id, kind, created_at, last_seen, expires_at, user_agent, ip, revoked) VALUES (?,?,?,?,?,?,?,?,0)', [s.id, s.userId, s.kind, s.createdAt, s.lastSeen, s.expiresAt, s.userAgent.slice(0, 200), s.ip]); }
export const findSession = async (id: string): Promise<Session | undefined> => { const r = await get('SELECT * FROM sessions WHERE id = ?', [id]) as Row | undefined; return r ? rowToSession(r) : undefined; };
export async function touchSession(id: string): Promise<void> { await run('UPDATE sessions SET last_seen = ? WHERE id = ?', [now(), id]); }
export async function revokeSession(id: string): Promise<void> { await run('UPDATE sessions SET revoked = 1 WHERE id = ?', [id]); }
export async function revokeAllSessions(userId: string, exceptId = ''): Promise<void> { await run('UPDATE sessions SET revoked = 1 WHERE user_id = ? AND id <> ?', [userId, exceptId]); }
export const listSessions = async (userId: string): Promise<Session[]> => (await all('SELECT * FROM sessions WHERE user_id = ? AND revoked = 0 AND expires_at > ? ORDER BY last_seen DESC LIMIT 50', [userId, now()]) as Row[]).map(rowToSession);
export async function purgeSessions(): Promise<void> { await run('DELETE FROM sessions WHERE expires_at < ? OR revoked = 1 AND last_seen < ?', [now(), new Date(Date.now() - 30 * 86400000).toISOString()]); }

export async function insertToken(token: string, kind: string, subject: string, ttlMs: number, payload = ''): Promise<void> { await run('INSERT INTO tokens (token, kind, subject, payload, expires_at, created_at) VALUES (?,?,?,?,?,?)', [token, kind, subject, payload, new Date(Date.now() + ttlMs).toISOString(), now()]); }
export async function consumeToken(token: string, kind: string): Promise<{ subject: string; payload: string } | null> {
  const r = await get('SELECT * FROM tokens WHERE token = ? AND kind = ? AND expires_at > ?', [token, kind, now()]) as Row | undefined;
  if (!r) return null;
  await run('DELETE FROM tokens WHERE token = ?', [token]);
  return { subject: String(r.subject), payload: String(r.payload ?? '') };
}
export async function peekToken(token: string, kind: string): Promise<{ subject: string; payload: string } | null> { const r = await get('SELECT * FROM tokens WHERE token = ? AND kind = ? AND expires_at > ?', [token, kind, now()]) as Row | undefined; return r ? { subject: String(r.subject), payload: String(r.payload ?? '') } : null; }
export async function deleteTokensFor(kind: string, subject: string): Promise<void> { await run('DELETE FROM tokens WHERE kind = ? AND subject = ?', [kind, subject]); }

// ---------------- Revisioni, note, blocchi, autosalvataggio ----------------
const rowToRevision = (r: Row): Revision => ({ id: String(r.id), articleId: String(r.article_id), userId: String(r.user_id ?? ''), note: String(r.note ?? ''), data: pj<Article>(r.data, {} as Article), createdAt: String(r.created_at ?? '') });
export async function insertRevision(rev: Revision): Promise<void> {
  await run('INSERT INTO article_revisions (id, article_id, user_id, note, data, created_at) VALUES (?,?,?,?,?,?)', [rev.id, rev.articleId, rev.userId, rev.note, JSON.stringify(rev.data), rev.createdAt]);
  await run('DELETE FROM article_revisions WHERE article_id = ? AND id NOT IN (SELECT id FROM article_revisions WHERE article_id = ? ORDER BY created_at DESC LIMIT 50)', [rev.articleId, rev.articleId]);
}
export const listRevisions = async (articleId: string, limit = 50): Promise<Revision[]> => (await all('SELECT * FROM article_revisions WHERE article_id = ? ORDER BY created_at DESC LIMIT ?', [articleId, limit]) as Row[]).map(rowToRevision);
export const findRevision = async (id: string): Promise<Revision | undefined> => { const r = await get('SELECT * FROM article_revisions WHERE id = ?', [id]) as Row | undefined; return r ? rowToRevision(r) : undefined; };
export const lastRevision = async (articleId: string): Promise<Revision | undefined> => { const r = await get('SELECT * FROM article_revisions WHERE article_id = ? ORDER BY created_at DESC LIMIT 1', [articleId]) as Row | undefined; return r ? rowToRevision(r) : undefined; };

const rowToNote = (r: Row): ArticleNote => ({ id: String(r.id), articleId: String(r.article_id), userId: String(r.user_id ?? ''), kind: (r.kind as ArticleNote['kind']) ?? 'note', body: String(r.body ?? ''), resolved: !!r.resolved, createdAt: String(r.created_at ?? ''), quote: String(r.quote ?? '') });
export async function insertNote(n: ArticleNote): Promise<void> { await run('INSERT INTO article_notes (id, article_id, user_id, kind, body, resolved, created_at, quote) VALUES (?,?,?,?,?,?,?,?)', [n.id, n.articleId, n.userId, n.kind, n.body, b(n.resolved), n.createdAt, (n.quote ?? '').slice(0, 400)]); }
export const listNotes = async (articleId: string): Promise<ArticleNote[]> => (await all('SELECT * FROM article_notes WHERE article_id = ? ORDER BY created_at DESC LIMIT 200', [articleId]) as Row[]).map(rowToNote);
export async function resolveNote(id: string, resolved: boolean): Promise<void> { await run('UPDATE article_notes SET resolved = ? WHERE id = ?', [b(resolved), id]); }
export async function deleteNote(id: string): Promise<void> { await run('DELETE FROM article_notes WHERE id = ?', [id]); }
export const countOpenChangeRequests = async (authorId?: string): Promise<number> => Number((await get(`SELECT COUNT(DISTINCT n.article_id) c FROM article_notes n JOIN articles a ON a.id = n.article_id WHERE n.kind = 'changes' AND n.resolved = 0 ${authorId ? 'AND a.author_id = ?' : ''}`, authorId ? [authorId] : []) as Row).c);

export async function acquireLock(articleId: string, userId: string, staleMs = 90_000): Promise<{ ok: boolean; holder?: string; since?: string }> {
  const r = await get('SELECT * FROM article_locks WHERE article_id = ?', [articleId]) as Row | undefined;
  const stale = !r || String(r.user_id) === userId || new Date(String(r.updated_at)).getTime() < Date.now() - staleMs;
  if (!stale) return { ok: false, holder: String(r!.user_id), since: String(r!.updated_at) };
  await run('INSERT INTO article_locks (article_id, user_id, updated_at) VALUES (?,?,?) ON CONFLICT (article_id) DO UPDATE SET user_id = excluded.user_id, updated_at = excluded.updated_at', [articleId, userId, now()]);
  return { ok: true };
}
export async function releaseLock(articleId: string, userId: string): Promise<void> { await run('DELETE FROM article_locks WHERE article_id = ? AND user_id = ?', [articleId, userId]); }
export async function saveAutosave(articleId: string, userId: string, data: Article): Promise<void> { await run('INSERT INTO autosaves (article_id, user_id, data, updated_at) VALUES (?,?,?,?) ON CONFLICT (article_id) DO UPDATE SET user_id = excluded.user_id, data = excluded.data, updated_at = excluded.updated_at', [articleId, userId, JSON.stringify(data), now()]); }
export async function findAutosave(articleId: string): Promise<{ userId: string; data: Article; updatedAt: string } | null> { const r = await get('SELECT * FROM autosaves WHERE article_id = ?', [articleId]) as Row | undefined; return r ? { userId: String(r.user_id), data: pj<Article>(r.data, {} as Article), updatedAt: String(r.updated_at) } : null; }
export async function deleteAutosave(articleId: string): Promise<void> { await run('DELETE FROM autosaves WHERE article_id = ?', [articleId]); }

// ---------------- Calendario editoriale ----------------
export async function articlesBetween(from: string, to: string): Promise<Article[]> {
  const rows = await all("SELECT * FROM articles WHERE (COALESCE(scheduled_at, published_at, deadline) >= ? AND COALESCE(scheduled_at, published_at, deadline) < ?) OR (status IN ('draft','review') AND deadline >= ? AND deadline < ?) ORDER BY COALESCE(scheduled_at, published_at, deadline) LIMIT 500", [from, to, from, to]) as Row[];
  return rows.map(rowToArticle);
}
export async function setSchedule(id: string, scheduledAt: string | null, publishedAt: string | null): Promise<void> { await run('UPDATE articles SET scheduled_at = ?, published_at = ?, updated_at = ? WHERE id = ?', [scheduledAt, publishedAt, now(), id]); }

// ---------------- Sondaggi ----------------
const rowToPoll = (r: Row): Poll => ({ id: String(r.id), articleId: String(r.article_id ?? ''), question: String(r.question), options: pj<string[]>(r.options, []), votes: pj<number[]>(r.votes, []), createdAt: String(r.created_at ?? '') });
export async function upsertPoll(p: Poll): Promise<void> { await run('INSERT INTO polls (id, article_id, question, options, votes, created_at) VALUES (?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET question = excluded.question, options = excluded.options', [p.id, p.articleId, p.question, JSON.stringify(p.options), JSON.stringify(p.votes), p.createdAt]); }
export const findPoll = async (id: string): Promise<Poll | undefined> => { const r = await get('SELECT * FROM polls WHERE id = ?', [id]) as Row | undefined; return r ? rowToPoll(r) : undefined; };
export async function votePoll(id: string, option: number): Promise<Poll | undefined> {
  const p = await findPoll(id); if (!p || option < 0 || option >= p.options.length) return p;
  const votes = p.options.map((_, i) => (p.votes[i] ?? 0) + (i === option ? 1 : 0));
  await run('UPDATE polls SET votes = ? WHERE id = ?', [JSON.stringify(votes), id]);
  return { ...p, votes };
}

// ---------------- Notifiche push ----------------
export async function insertPushSubscription(id: string, endpoint: string, keys: { p256dh: string; auth: string }, topics: string[]): Promise<void> { await run('INSERT INTO push_subscriptions (id, endpoint, keys, topics, created_at) VALUES (?,?,?,?,?) ON CONFLICT (endpoint) DO UPDATE SET keys = excluded.keys, topics = excluded.topics, failures = 0', [id, endpoint, JSON.stringify(keys), JSON.stringify(topics), now()]); }
export async function deletePushSubscription(endpoint: string): Promise<void> { await run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]); }
export const listPushSubscriptions = async (limit = 20000): Promise<{ endpoint: string; keys: { p256dh: string; auth: string }; topics: string[] }[]> => (await all('SELECT * FROM push_subscriptions WHERE failures < 3 ORDER BY created_at LIMIT ?', [limit]) as Row[]).map((r) => ({ endpoint: String(r.endpoint), keys: pj<{ p256dh: string; auth: string }>(r.keys, { p256dh: '', auth: '' }), topics: pj<string[]>(r.topics, []) }));
export const countPushSubscriptions = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM push_subscriptions WHERE failures < 3') as Row).c);
export async function markPushFailure(endpoint: string): Promise<void> { await run('UPDATE push_subscriptions SET failures = failures + 1 WHERE endpoint = ?', [endpoint]); }

// ---------------- Statistiche (aggregati orari) ----------------
export async function recordHit(path: string, articleId: string, source: string, readMs: number): Promise<void> {
  const d = new Date(); const day = d.toISOString().slice(0, 10); const hour = d.getUTCHours();
  await run('INSERT INTO hits (day, hour, path, article_id, source, count, read_ms) VALUES (?,?,?,?,?,?,?) ON CONFLICT (day, hour, path, source) DO UPDATE SET count = hits.count + excluded.count, read_ms = hits.read_ms + excluded.read_ms', [day, hour, path.slice(0, 300), articleId, source.slice(0, 40), readMs > 0 ? 0 : 1, Math.max(0, Math.min(readMs, 3_600_000))]);
}
export async function hitsByDay(days: number): Promise<{ day: string; views: number }[]> { const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); return (await all('SELECT day, SUM(count) v FROM hits WHERE day >= ? GROUP BY day ORDER BY day', [from]) as Row[]).map((r) => ({ day: String(r.day), views: Number(r.v) })); }
export async function hitsByHour(day: string): Promise<{ hour: number; views: number }[]> { return (await all('SELECT hour, SUM(count) v FROM hits WHERE day = ? GROUP BY hour ORDER BY hour', [day]) as Row[]).map((r) => ({ hour: Number(r.hour), views: Number(r.v) })); }
export async function hitsBySource(days: number): Promise<{ source: string; views: number }[]> { const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); return (await all('SELECT source, SUM(count) v FROM hits WHERE day >= ? GROUP BY source ORDER BY v DESC LIMIT 12', [from]) as Row[]).map((r) => ({ source: String(r.source), views: Number(r.v) })); }
export async function topArticlesByHits(days: number, limit = 15): Promise<{ articleId: string; path: string; views: number; readSec: number }[]> { const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); return (await all("SELECT article_id, MAX(path) p, SUM(count) v, CASE WHEN SUM(count) > 0 THEN SUM(read_ms) / SUM(count) / 1000 ELSE 0 END rs FROM hits WHERE day >= ? AND article_id <> '' GROUP BY article_id ORDER BY v DESC LIMIT ?", [from, limit]) as Row[]).map((r) => ({ articleId: String(r.article_id), path: String(r.p), views: Number(r.v), readSec: Math.round(Number(r.rs ?? 0)) })); }
export async function hitsTotals(days: number): Promise<{ views: number; readSec: number; paths: number }> { const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); const r = await get('SELECT COALESCE(SUM(count),0) v, CASE WHEN SUM(count) > 0 THEN SUM(read_ms) / SUM(count) / 1000 ELSE 0 END rs, COUNT(DISTINCT path) p FROM hits WHERE day >= ?', [from]) as Row; return { views: Number(r.v), readSec: Math.round(Number(r.rs ?? 0)), paths: Number(r.p) }; }
export async function articleHits(articleId: string, days = 30): Promise<HitRow[]> { const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10); return (await all('SELECT * FROM hits WHERE article_id = ? AND day >= ? ORDER BY day, hour', [articleId, from]) as Row[]).map((r) => ({ day: String(r.day), hour: Number(r.hour), path: String(r.path), articleId: String(r.article_id), source: String(r.source), count: Number(r.count), readMs: Number(r.read_ms) })); }
export async function purgeHits(keepDays = 400): Promise<void> { await run('DELETE FROM hits WHERE day < ?', [new Date(Date.now() - keepDays * 86400000).toISOString().slice(0, 10)]); }

// ---------------- Lettori registrati ----------------
const rowToReader = (r: Row): Reader => ({ id: String(r.id), email: String(r.email), name: String(r.name ?? ''), verified: !!r.verified, premium: !!r.premium && (!r.premium_until || String(r.premium_until) > now()), premiumUntil: (r.premium_until as string | null) ?? null, stripeCustomer: String(r.stripe_customer ?? ''), banned: !!r.banned, createdAt: String(r.created_at ?? ''), lastLogin: (r.last_login as string | null) ?? null, provider: String(r.provider ?? ''), avatar: String(r.avatar ?? ''), prefs: pj<Reader['prefs']>(r.prefs, {}) });
export async function insertReader(rd: Reader, passwordHash: string | null): Promise<void> { await run('INSERT INTO readers (id, email, name, password_hash, verified, premium, premium_until, stripe_customer, banned, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [rd.id, rd.email, rd.name, passwordHash, b(rd.verified), b(rd.premium), rd.premiumUntil, rd.stripeCustomer, b(rd.banned), rd.createdAt]); }
export const findReader = async (id: string): Promise<Reader | undefined> => { const r = await get('SELECT * FROM readers WHERE id = ?', [id]) as Row | undefined; return r ? rowToReader(r) : undefined; };
export const findReaderByEmail = async (email: string): Promise<Reader | undefined> => { const r = await get('SELECT * FROM readers WHERE lower(email) = lower(?)', [email]) as Row | undefined; return r ? rowToReader(r) : undefined; };
export const readerPasswordHash = async (id: string): Promise<string | null> => ((await get('SELECT password_hash FROM readers WHERE id = ?', [id])) as Row | undefined)?.password_hash as string | null ?? null;
export async function updateReader(id: string, patch: { name?: string; verified?: boolean; premium?: boolean; premiumUntil?: string | null; stripeCustomer?: string; banned?: boolean; passwordHash?: string; lastLogin?: string }): Promise<void> {
  const cols: Record<string, unknown> = {};
  if (patch.name !== undefined) cols.name = patch.name; if (patch.verified !== undefined) cols.verified = b(patch.verified); if (patch.premium !== undefined) cols.premium = b(patch.premium);
  if (patch.premiumUntil !== undefined) cols.premium_until = patch.premiumUntil; if (patch.stripeCustomer !== undefined) cols.stripe_customer = patch.stripeCustomer; if (patch.banned !== undefined) cols.banned = b(patch.banned);
  if (patch.passwordHash !== undefined) cols.password_hash = patch.passwordHash; if (patch.lastLogin !== undefined) cols.last_login = patch.lastLogin;
  if (!Object.keys(cols).length) return;
  await run(`UPDATE readers SET ${Object.keys(cols).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...Object.values(cols), id]);
}
export const listReaders = async (limit = 200, offset = 0, q = ''): Promise<Reader[]> => (await all(`SELECT * FROM readers ${q ? 'WHERE email ILIKE ? OR name ILIKE ?' : ''} ORDER BY created_at DESC LIMIT ? OFFSET ?`, q ? [`%${q}%`, `%${q}%`, limit, offset] : [limit, offset]) as Row[]).map(rowToReader);
export const countReaders = async (): Promise<{ total: number; premium: number }> => { const r = await get("SELECT COUNT(*) t, COALESCE(SUM(CASE WHEN premium = 1 THEN 1 ELSE 0 END),0) p FROM readers") as Row; return { total: Number(r.t), premium: Number(r.p) }; };
export const findReaderByStripeCustomer = async (customer: string): Promise<Reader | undefined> => { const r = await get('SELECT * FROM readers WHERE stripe_customer = ?', [customer]) as Row | undefined; return r ? rowToReader(r) : undefined; };

// ---------------- Commenti: segnalazioni, più commentati ----------------
export async function flagComment(commentId: string, voter: string): Promise<number> {
  await run('INSERT INTO comment_flags (comment_id, voter, created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING', [commentId, voter, now()]);
  await run('UPDATE comments SET flags = (SELECT COUNT(*) FROM comment_flags WHERE comment_id = ?) WHERE id = ?', [commentId, commentId]);
  return Number(((await get('SELECT flags FROM comments WHERE id = ?', [commentId])) as Row | undefined)?.flags ?? 0);
}
export async function mostCommented(limit = 6, days = 30): Promise<{ articleId: string; n: number }[]> { const from = new Date(Date.now() - days * 86400000).toISOString(); return (await all("SELECT c.article_id, COUNT(*) n FROM comments c JOIN articles a ON a.id = c.article_id WHERE c.status = 'approved' AND c.created_at >= ? AND a.status = 'published' GROUP BY c.article_id ORDER BY n DESC LIMIT ?", [from, limit]) as Row[]).map((r) => ({ articleId: String(r.article_id), n: Number(r.n) })); }
export const countFlaggedComments = async (min: number): Promise<number> => Number((await get("SELECT COUNT(*) c FROM comments WHERE flags >= ? AND status = 'approved'", [min]) as Row).c);

// ---------------- Redirect e 404 ----------------
const rowToRedirect = (r: Row): Redirect => ({ id: String(r.id), fromPath: String(r.from_path), toPath: String(r.to_path), code: Number(r.code ?? 301), hits: Number(r.hits ?? 0), createdAt: String(r.created_at ?? '') });
export const listRedirects = async (limit = 2000, q = ''): Promise<Redirect[]> => (await all(`SELECT * FROM redirects ${q ? 'WHERE from_path ILIKE ? OR to_path ILIKE ?' : ''} ORDER BY created_at DESC LIMIT ?`, q ? [`%${q}%`, `%${q}%`, limit] : [limit]) as Row[]).map(rowToRedirect);
export const countRedirects = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM redirects') as Row).c);
export async function upsertRedirect(r: Redirect): Promise<void> { await run('INSERT INTO redirects (id, from_path, to_path, code, hits, created_at) VALUES (?,?,?,?,0,?) ON CONFLICT (from_path) DO UPDATE SET to_path = excluded.to_path, code = excluded.code', [r.id, r.fromPath, r.toPath, r.code, r.createdAt]); }
export async function bulkUpsertRedirects(list: Redirect[]): Promise<void> { await batch(list.map((r) => ({ sql: 'INSERT INTO redirects (id, from_path, to_path, code, hits, created_at) VALUES (?,?,?,?,0,?) ON CONFLICT (from_path) DO UPDATE SET to_path = excluded.to_path, code = excluded.code', args: [r.id, r.fromPath, r.toPath, r.code, r.createdAt] }))); }
export async function deleteRedirect(id: string): Promise<void> { await run('DELETE FROM redirects WHERE id = ?', [id]); }
export async function findRedirect(path: string): Promise<Redirect | undefined> { const r = await get('SELECT * FROM redirects WHERE from_path = ? OR from_path = ?', [path, path.replace(/\/$/, '') || '/']) as Row | undefined; if (r) await run('UPDATE redirects SET hits = hits + 1 WHERE id = ?', [r.id]); return r ? rowToRedirect(r) : undefined; }
export async function logNotFound(path: string, referer: string): Promise<void> { await run('INSERT INTO not_found_log (path, hits, referer, first_seen, last_seen) VALUES (?,1,?,?,?) ON CONFLICT (path) DO UPDATE SET hits = not_found_log.hits + 1, last_seen = excluded.last_seen, referer = CASE WHEN excluded.referer <> \'\' THEN excluded.referer ELSE not_found_log.referer END', [path.slice(0, 500), referer.slice(0, 300), now(), now()]); }
export const listNotFound = async (limit = 100): Promise<NotFoundEntry[]> => (await all('SELECT * FROM not_found_log ORDER BY hits DESC, last_seen DESC LIMIT ?', [limit]) as Row[]).map((r) => ({ path: String(r.path), hits: Number(r.hits), referer: String(r.referer ?? ''), firstSeen: String(r.first_seen ?? ''), lastSeen: String(r.last_seen ?? '') }));
export async function deleteNotFound(path: string): Promise<void> { await run('DELETE FROM not_found_log WHERE path = ?', [path]); }
export async function clearNotFound(): Promise<void> { await run('DELETE FROM not_found_log'); }

// ---------------- Edizioni (multi-testata) ----------------
const rowToEdition = (r: Row): Edition => ({ id: String(r.id), slug: String(r.slug), name: String(r.name), domain: String(r.domain ?? ''), tagline: String(r.tagline ?? ''), zoneId: String(r.zone_id ?? ''), categoryIds: pj<string[]>(r.category_ids, []), theme: pj<Edition['theme']>(r.theme, {}), logo: String(r.logo ?? ''), active: !!r.active, createdAt: String(r.created_at ?? '') });
export const listEditions = async (): Promise<Edition[]> => (await all('SELECT * FROM editions ORDER BY name') as Row[]).map(rowToEdition);
export const findEditionByDomain = async (domain: string): Promise<Edition | undefined> => { const r = await get('SELECT * FROM editions WHERE active = 1 AND lower(domain) = lower(?)', [domain]) as Row | undefined; return r ? rowToEdition(r) : undefined; };
export const findEditionBySlug = async (slug: string): Promise<Edition | undefined> => { const r = await get('SELECT * FROM editions WHERE slug = ?', [slug]) as Row | undefined; return r ? rowToEdition(r) : undefined; };
export async function upsertEdition(e: Edition): Promise<void> { await run('INSERT INTO editions (id, slug, name, domain, tagline, zone_id, category_ids, theme, logo, active, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, name=excluded.name, domain=excluded.domain, tagline=excluded.tagline, zone_id=excluded.zone_id, category_ids=excluded.category_ids, theme=excluded.theme, logo=excluded.logo, active=excluded.active', [e.id, e.slug, e.name, e.domain || null, e.tagline, e.zoneId, JSON.stringify(e.categoryIds), JSON.stringify(e.theme), e.logo, b(e.active), e.createdAt]); }
export async function deleteEdition(id: string): Promise<void> { await run('DELETE FROM editions WHERE id = ?', [id]); await run("UPDATE articles SET edition_id = '' WHERE edition_id = ?", [id]); }

// ---------------- Errori applicativi ----------------
export async function logError(digest: string, message: string, stack: string, path: string): Promise<void> {
  const id = 'er_' + (digest || Math.random().toString(36).slice(2, 10));
  await run('INSERT INTO error_log (id, digest, message, stack, path, count, first_seen, last_seen) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT (id) DO UPDATE SET count = error_log.count + 1, last_seen = excluded.last_seen, path = excluded.path', [id, digest, message.slice(0, 500), stack.slice(0, 4000), path.slice(0, 300), now(), now()]);
}
export const listErrors = async (limit = 100): Promise<ErrorEntry[]> => (await all('SELECT * FROM error_log ORDER BY last_seen DESC LIMIT ?', [limit]) as Row[]).map((r) => ({ id: String(r.id), digest: String(r.digest ?? ''), message: String(r.message ?? ''), stack: String(r.stack ?? ''), path: String(r.path ?? ''), count: Number(r.count ?? 1), firstSeen: String(r.first_seen ?? ''), lastSeen: String(r.last_seen ?? '') }));
export const countErrorsSince = async (iso: string): Promise<number> => Number((await get('SELECT COALESCE(SUM(count),0) c FROM error_log WHERE last_seen >= ?', [iso]) as Row).c);
export async function clearErrors(): Promise<void> { await run('DELETE FROM error_log'); }

// ---------------- Newsletter, backup ----------------
export async function insertNewsletterSend(s: NewsletterSend): Promise<void> { await run('INSERT INTO newsletter_sends (id, subject, kind, recipients, sent_at, status, message, list_id) VALUES (?,?,?,?,?,?,?,?)', [s.id, s.subject, s.kind, s.recipients, s.sentAt, s.status, s.message, s.listId ?? '']); }
export const listNewsletterSends = async (limit = 30): Promise<NewsletterSend[]> => (await all('SELECT * FROM newsletter_sends ORDER BY sent_at DESC LIMIT ?', [limit]) as Row[]).map((r) => ({ id: String(r.id), subject: String(r.subject ?? ''), kind: String(r.kind ?? ''), recipients: Number(r.recipients ?? 0), sentAt: String(r.sent_at ?? ''), status: String(r.status ?? ''), message: String(r.message ?? ''), listId: String(r.list_id ?? ''), opens: Number(r.opens ?? 0), clicks: Number(r.clicks ?? 0) }));
export const lastDigestDay = async (): Promise<string> => String(((await get("SELECT sent_at FROM newsletter_sends WHERE kind = 'digest' AND status = 'sent' ORDER BY sent_at DESC LIMIT 1")) as Row | undefined)?.sent_at ?? '').slice(0, 10);
export async function insertBackup(bk: BackupEntry): Promise<void> { await run('INSERT INTO backups (id, created_at, size, url, note) VALUES (?,?,?,?,?)', [bk.id, bk.createdAt, bk.size, bk.url, bk.note]); }
export const listBackups = async (limit = 30): Promise<BackupEntry[]> => (await all('SELECT * FROM backups ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map((r) => ({ id: String(r.id), createdAt: String(r.created_at ?? ''), size: Number(r.size ?? 0), url: String(r.url ?? ''), note: String(r.note ?? '') }));
export async function deleteBackupRow(id: string): Promise<void> { await run('DELETE FROM backups WHERE id = ?', [id]); }

// ---------------- Esportazione completa a blocchi ----------------
export async function* iterateTable(table: string, size = 500): AsyncGenerator<Row[]> {
  let offset = 0;
  for (;;) { const rows = await all(`SELECT * FROM ${table} ORDER BY 1 LIMIT ? OFFSET ?`, [size, offset]) as Row[]; if (!rows.length) return; yield rows; offset += rows.length; if (rows.length < size) return; }
}
export async function tableCounts(): Promise<Record<string, number>> {
  const tables = ['articles', 'categories', 'tags', 'users', 'zones', 'comments', 'media', 'subscribers', 'events', 'reports', 'readers', 'redirects', 'editions', 'article_revisions'];
  const out: Record<string, number> = {};
  for (const t of tables) out[t] = Number(((await get(`SELECT COUNT(*) c FROM ${t}`)) as Row).c);
  return out;
}
export async function usersWithoutPassword(): Promise<User[]> { return (await all('SELECT * FROM users WHERE password_hash IS NULL AND active = 1 ORDER BY created_at') as Row[]).map(rowToUser); }
