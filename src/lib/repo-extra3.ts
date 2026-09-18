import 'server-only';
import { all, get, run } from './db';
import { ApiKey, Article, BrokenLink, Donation, Notification, Page, ReaderPrefs } from './models';
import { rowToArticle } from './repo';

type Row = Record<string, unknown>;
const b = (v: unknown) => (v ? 1 : 0);
const pj = <T,>(s: unknown, fallback: T): T => { try { return s ? (JSON.parse(String(s)) as T) : fallback; } catch { return fallback; } };
const now = () => new Date().toISOString();

// ---------------- Pagine statiche ----------------
const rowToPage = (r: Row): Page => ({ id: String(r.id), slug: String(r.slug), title: String(r.title), content: String(r.content ?? ''), excerpt: String(r.excerpt ?? ''), status: (r.status as Page['status']) ?? 'draft', template: (r.template as Page['template']) ?? 'standard', coverImage: String(r.cover_image ?? ''), seo: { title: '', description: '', canonical: '', noIndex: false, ...pj<Partial<Page['seo']>>(r.seo, {}) }, showInMenu: !!r.show_in_menu, menuOrder: Number(r.menu_order ?? 0), authorId: String(r.author_id ?? ''), createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? ''), extra: pj<Page['extra']>(r.extra, {}) });
export const listPages = async (publishedOnly = false): Promise<Page[]> => (await all(`SELECT * FROM pages ${publishedOnly ? "WHERE status = 'published'" : ''} ORDER BY menu_order, title`) as Row[]).map(rowToPage);
export const findPage = async (id: string): Promise<Page | undefined> => { const r = await get('SELECT * FROM pages WHERE id = ?', [id]) as Row | undefined; return r ? rowToPage(r) : undefined; };
export const findPageBySlug = async (slug: string, publishedOnly = true): Promise<Page | undefined> => { const r = await get(`SELECT * FROM pages WHERE slug = ? ${publishedOnly ? "AND status = 'published'" : ''}`, [slug]) as Row | undefined; return r ? rowToPage(r) : undefined; };
export async function upsertPage(p: Page): Promise<void> { await run('INSERT INTO pages (id, slug, title, content, excerpt, status, template, cover_image, seo, show_in_menu, menu_order, author_id, created_at, updated_at, extra) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET slug=excluded.slug, title=excluded.title, content=excluded.content, excerpt=excluded.excerpt, status=excluded.status, template=excluded.template, cover_image=excluded.cover_image, seo=excluded.seo, show_in_menu=excluded.show_in_menu, menu_order=excluded.menu_order, updated_at=excluded.updated_at, extra = excluded.extra', [p.id, p.slug, p.title, p.content, p.excerpt, p.status, p.template, p.coverImage, JSON.stringify(p.seo), b(p.showInMenu), p.menuOrder, p.authorId, p.createdAt, p.updatedAt, JSON.stringify(p.extra ?? {})]); }
export async function deletePage(id: string): Promise<void> { await run('DELETE FROM pages WHERE id = ?', [id]); }
export const pageSlugExists = async (slug: string, excludeId: string): Promise<boolean> => !!await get('SELECT 1 FROM pages WHERE slug = ? AND id <> ?', [slug, excludeId]);

// ---------------- Lettori: preferiti e preferenze ----------------
export async function toggleBookmark(readerId: string, articleId: string): Promise<boolean> {
  const ex = await get('SELECT 1 FROM reader_bookmarks WHERE reader_id = ? AND article_id = ?', [readerId, articleId]);
  if (ex) { await run('DELETE FROM reader_bookmarks WHERE reader_id = ? AND article_id = ?', [readerId, articleId]); return false; }
  await run('INSERT INTO reader_bookmarks (reader_id, article_id, created_at) VALUES (?,?,?)', [readerId, articleId, now()]); return true;
}
export const isBookmarked = async (readerId: string, articleId: string): Promise<boolean> => !!await get('SELECT 1 FROM reader_bookmarks WHERE reader_id = ? AND article_id = ?', [readerId, articleId]);
export const bookmarkedArticles = async (readerId: string, limit = 100): Promise<Article[]> => (await all("SELECT a.* FROM reader_bookmarks rb JOIN articles a ON a.id = rb.article_id WHERE rb.reader_id = ? AND a.status = 'published' AND a.deleted_at IS NULL ORDER BY rb.created_at DESC LIMIT ?", [readerId, limit]) as Row[]).map(rowToArticle);
export async function savePrefs(readerId: string, prefs: ReaderPrefs): Promise<void> { await run('UPDATE readers SET prefs = ? WHERE id = ?', [JSON.stringify(prefs), readerId]); }
export async function articlesForPrefs(prefs: ReaderPrefs, limit = 24): Promise<Article[]> {
  const w: string[] = []; const p: unknown[] = [];
  if (prefs.zones?.length) { w.push(`a.zone_id IN (${prefs.zones.map(() => '?').join(',')})`); p.push(...prefs.zones); }
  if (prefs.categories?.length) { w.push(`a.category_id IN (${prefs.categories.map(() => '?').join(',')})`); p.push(...prefs.categories); }
  if (prefs.tags?.length) { w.push(`a.id IN (SELECT article_id FROM article_tags WHERE tag_id IN (${prefs.tags.map(() => '?').join(',')}))`); p.push(...prefs.tags); }
  if (!w.length) return [];
  return (await all(`SELECT a.* FROM articles a WHERE a.status = 'published' AND a.deleted_at IS NULL AND (${w.join(' OR ')}) ORDER BY a.published_at DESC LIMIT ?`, [...p, limit]) as Row[]).map(rowToArticle);
}
export async function exportReaderData(readerId: string): Promise<Record<string, unknown>> {
  const [reader, comments, bookmarks, donations] = await Promise.all([get('SELECT id, email, name, verified, premium, premium_until, provider, prefs, created_at, last_login FROM readers WHERE id = ?', [readerId]), all('SELECT id, article_id, body, status, created_at FROM comments WHERE reader_id = ?', [readerId]), all('SELECT article_id, created_at FROM reader_bookmarks WHERE reader_id = ?', [readerId]), all('SELECT amount, status, created_at FROM donations WHERE reader_id = ?', [readerId])]);
  return { esportatoIl: now(), account: reader, commenti: comments, preferiti: bookmarks, donazioni: donations };
}
export async function deleteReaderData(readerId: string, email: string): Promise<void> {
  await run("UPDATE comments SET author_name = 'Utente cancellato', email = '', reader_id = '' WHERE reader_id = ?", [readerId]);
  await run('DELETE FROM reader_bookmarks WHERE reader_id = ?', [readerId]);
  await run("UPDATE donations SET name = '', email = '', reader_id = '' WHERE reader_id = ?", [readerId]);
  await run('DELETE FROM subscriber_lists WHERE subscriber_id IN (SELECT id FROM subscribers WHERE lower(email) = lower(?))', [email]);
  await run('DELETE FROM subscribers WHERE lower(email) = lower(?)', [email]);
  await run("UPDATE sessions SET revoked = 1 WHERE user_id = ? AND kind = 'reader'", [readerId]);
  await run('DELETE FROM readers WHERE id = ?', [readerId]);
}

// ---------------- Voti sui commenti ----------------
export async function voteComment(commentId: string, voter: string): Promise<{ votes: number; voted: boolean }> {
  const ex = await get('SELECT 1 FROM comment_votes WHERE comment_id = ? AND voter = ?', [commentId, voter]);
  if (ex) await run('DELETE FROM comment_votes WHERE comment_id = ? AND voter = ?', [commentId, voter]); else await run('INSERT INTO comment_votes (comment_id, voter, value) VALUES (?,?,1)', [commentId, voter]);
  await run('UPDATE comments SET votes = (SELECT COUNT(*) FROM comment_votes WHERE comment_id = ?) WHERE id = ?', [commentId, commentId]);
  return { votes: Number(((await get('SELECT votes FROM comments WHERE id = ?', [commentId])) as Row | undefined)?.votes ?? 0), voted: !ex };
}
export const votedCommentIds = async (voter: string, articleId: string): Promise<string[]> => (await all('SELECT cv.comment_id FROM comment_votes cv JOIN comments c ON c.id = cv.comment_id WHERE cv.voter = ? AND c.article_id = ?', [voter, articleId]) as Row[]).map((r) => String(r.comment_id));

// ---------------- Donazioni ----------------
const rowToDonation = (r: Row): Donation => ({ id: String(r.id), amount: Number(r.amount), name: String(r.name ?? ''), email: String(r.email ?? ''), message: String(r.message ?? ''), status: r.status as Donation['status'], readerId: String(r.reader_id ?? ''), createdAt: String(r.created_at ?? ''), paidAt: (r.paid_at as string | null) ?? null });
export async function insertDonation(d: Donation): Promise<void> { await run('INSERT INTO donations (id, amount, name, email, message, status, reader_id, created_at, paid_at) VALUES (?,?,?,?,?,?,?,?,?)', [d.id, d.amount, d.name, d.email, d.message, d.status, d.readerId, d.createdAt, d.paidAt]); }
export async function markDonationPaid(id: string): Promise<Donation | undefined> { await run("UPDATE donations SET status = 'paid', paid_at = ? WHERE id = ?", [now(), id]); const r = await get('SELECT * FROM donations WHERE id = ?', [id]) as Row | undefined; return r ? rowToDonation(r) : undefined; }
export const listDonations = async (limit = 200): Promise<Donation[]> => (await all('SELECT * FROM donations ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map(rowToDonation);
export const donationTotals = async (): Promise<{ total: number; count: number; month: number }> => { const r = await get("SELECT COALESCE(SUM(amount),0) t, COUNT(*) c, COALESCE(SUM(CASE WHEN paid_at >= ? THEN amount ELSE 0 END),0) m FROM donations WHERE status = 'paid'", [new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()]) as Row; return { total: Number(r.t), count: Number(r.c), month: Number(r.m) }; };

// ---------------- Chiavi API ----------------
const rowToKey = (r: Row): ApiKey => ({ id: String(r.id), name: String(r.name), prefix: String(r.prefix), scopes: pj<string[]>(r.scopes, ['read']), active: !!r.active, calls: Number(r.calls ?? 0), lastUsed: (r.last_used as string | null) ?? null, createdBy: String(r.created_by ?? ''), createdAt: String(r.created_at ?? '') });
export async function insertApiKey(k: ApiKey, keyHash: string): Promise<void> { await run('INSERT INTO api_keys (id, name, prefix, key_hash, scopes, active, calls, created_by, created_at) VALUES (?,?,?,?,?,?,0,?,?)', [k.id, k.name, k.prefix, keyHash, JSON.stringify(k.scopes), b(k.active), k.createdBy, k.createdAt]); }
export const listApiKeys = async (): Promise<ApiKey[]> => (await all('SELECT * FROM api_keys ORDER BY created_at DESC') as Row[]).map(rowToKey);
export async function findApiKeyByHash(hash: string): Promise<ApiKey | undefined> { const r = await get('SELECT * FROM api_keys WHERE key_hash = ? AND active = 1', [hash]) as Row | undefined; if (r) run('UPDATE api_keys SET calls = calls + 1, last_used = ? WHERE id = ?', [now(), r.id]).catch(() => {}); return r ? rowToKey(r) : undefined; }
export async function setApiKeyActive(id: string, active: boolean): Promise<void> { await run('UPDATE api_keys SET active = ? WHERE id = ?', [b(active), id]); }
export async function deleteApiKey(id: string): Promise<void> { await run('DELETE FROM api_keys WHERE id = ?', [id]); }

// ---------------- Link rotti ----------------
const rowToBroken = (r: Row): BrokenLink => ({ id: String(r.id), articleId: String(r.article_id), url: String(r.url), status: Number(r.status ?? 0), error: String(r.error ?? ''), checkedAt: String(r.checked_at ?? ''), fixed: !!r.fixed });
export async function upsertBrokenLink(l: BrokenLink): Promise<void> { await run('INSERT INTO broken_links (id, article_id, url, status, error, checked_at, fixed) VALUES (?,?,?,?,?,?,0) ON CONFLICT (id) DO UPDATE SET status = excluded.status, error = excluded.error, checked_at = excluded.checked_at, fixed = 0', [l.id, l.articleId, l.url, l.status, l.error, l.checkedAt]); }
export const listBrokenLinks = async (limit = 200): Promise<BrokenLink[]> => (await all('SELECT * FROM broken_links WHERE fixed = 0 ORDER BY checked_at DESC LIMIT ?', [limit]) as Row[]).map(rowToBroken);
export async function markBrokenFixed(id: string): Promise<void> { await run('UPDATE broken_links SET fixed = 1 WHERE id = ?', [id]); }
export async function clearBrokenForArticle(articleId: string): Promise<void> { await run('DELETE FROM broken_links WHERE article_id = ?', [articleId]); }
export const countBrokenLinks = async (): Promise<number> => Number((await get('SELECT COUNT(*) c FROM broken_links WHERE fixed = 0') as Row).c);

// ---------------- Notifiche in redazione ----------------
const rowToNotif = (r: Row): Notification => ({ id: String(r.id), userId: String(r.user_id), kind: String(r.kind ?? 'info'), text: String(r.text), url: String(r.url ?? ''), read: !!r.read, createdAt: String(r.created_at ?? '') });
export async function insertNotification(n: Notification): Promise<void> { await run('INSERT INTO notifications (id, user_id, kind, text, url, read, created_at) VALUES (?,?,?,?,?,0,?)', [n.id, n.userId, n.kind, n.text.slice(0, 300), n.url, n.createdAt]); await run('DELETE FROM notifications WHERE user_id = ? AND id NOT IN (SELECT id FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 200)', [n.userId, n.userId]); }
export const listNotifications = async (userId: string, limit = 30): Promise<Notification[]> => (await all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]) as Row[]).map(rowToNotif);
export const countUnread = async (userId: string): Promise<number> => Number((await get('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0', [userId]) as Row).c);
export async function markNotificationsRead(userId: string, id?: string): Promise<void> { if (id) await run('UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?', [userId, id]); else await run('UPDATE notifications SET read = 1 WHERE user_id = ?', [userId]); }

// ---------------- Il mio lavoro ----------------
export const myWork = async (userId: string): Promise<{ drafts: Article[]; assigned: Article[]; review: Article[]; changes: Article[] }> => {
  const q = async (sql: string, args: unknown[]) => (await all(sql, args) as Row[]).map(rowToArticle);
  const [drafts, assigned, review, changes] = await Promise.all([
    q("SELECT * FROM articles WHERE author_id = ? AND status = 'draft' AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 10", [userId]),
    q("SELECT * FROM articles WHERE assigned_to = ? AND status IN ('draft','review') AND deleted_at IS NULL ORDER BY COALESCE(deadline, '9999') ASC LIMIT 10", [userId]),
    q("SELECT * FROM articles WHERE status = 'review' AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 10", []),
    q("SELECT a.* FROM articles a WHERE a.author_id = ? AND a.deleted_at IS NULL AND a.id IN (SELECT article_id FROM article_notes WHERE kind = 'changes' AND resolved = 0) ORDER BY a.updated_at DESC LIMIT 10", [userId]),
  ]);
  return { drafts, assigned, review, changes };
};

// ---------------- PageSpeed ----------------
const rowToPs = (r: Row): import('./models').PageSpeedRun => { let opportunities = []; try { opportunities = typeof r.opportunities === 'string' ? JSON.parse(r.opportunities) : (r.opportunities as never) ?? []; } catch { /* ignora */ } return { id: String(r.id), url: String(r.url), strategy: (r.strategy as 'mobile' | 'desktop') ?? 'mobile', performance: Number(r.performance ?? 0), accessibility: Number(r.accessibility ?? 0), bestPractices: Number(r.best_practices ?? 0), seo: Number(r.seo ?? 0), lcp: Number(r.lcp ?? 0), cls: Number(r.cls ?? 0), tbt: Number(r.tbt ?? 0), fcp: Number(r.fcp ?? 0), si: Number(r.si ?? 0), opportunities, createdAt: String(r.created_at ?? '') }; };
export async function insertPageSpeedRun(p: import('./models').PageSpeedRun): Promise<void> { await run('INSERT INTO pagespeed_runs (id, url, strategy, performance, accessibility, best_practices, seo, lcp, cls, tbt, fcp, si, opportunities, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [p.id, p.url, p.strategy, p.performance, p.accessibility, p.bestPractices, p.seo, p.lcp, p.cls, p.tbt, p.fcp, p.si, JSON.stringify(p.opportunities), p.createdAt]); }
export const listPageSpeedRuns = async (limit = 60): Promise<import('./models').PageSpeedRun[]> => (await all('SELECT * FROM pagespeed_runs ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map(rowToPs);
export const latestPageSpeedRun = async (url: string, strategy: string): Promise<import('./models').PageSpeedRun | null> => { const r = (await get('SELECT * FROM pagespeed_runs WHERE url = ? AND strategy = ? ORDER BY created_at DESC LIMIT 1', [url, strategy])) as Row | undefined; return r ? rowToPs(r) : null; };
export async function prunePageSpeedRuns(keep = 400): Promise<void> { await run('DELETE FROM pagespeed_runs WHERE id NOT IN (SELECT id FROM pagespeed_runs ORDER BY created_at DESC LIMIT ?)', [keep]); }

// ---------------- Blocchi riutilizzabili ----------------
const rowToSnippet = (r: Row): import('./models').Snippet => ({ id: String(r.id), name: String(r.name), html: String(r.html ?? ''), updatedAt: String(r.updated_at ?? '') });
export const listSnippets = async (): Promise<import('./models').Snippet[]> => (await all('SELECT * FROM snippets ORDER BY name') as Row[]).map(rowToSnippet);
export const findSnippet = async (id: string): Promise<import('./models').Snippet | undefined> => { const r = (await get('SELECT * FROM snippets WHERE id = ?', [id])) as Row | undefined; return r ? rowToSnippet(r) : undefined; };
export async function upsertSnippet(s: import('./models').Snippet): Promise<void> { await run('INSERT INTO snippets (id, name, html, updated_at) VALUES (?,?,?,?) ON CONFLICT (id) DO UPDATE SET name = excluded.name, html = excluded.html, updated_at = excluded.updated_at', [s.id, s.name, s.html, s.updatedAt]); }
export async function deleteSnippet(id: string): Promise<void> { await run('DELETE FROM snippets WHERE id = ?', [id]); }

// ---------------- Rubrica contatti ----------------
const rowToContact = (r: Row): import('./models').Contact => ({ id: String(r.id), name: String(r.name), role: String(r.role ?? ''), org: String(r.org ?? ''), phone: String(r.phone ?? ''), email: String(r.email ?? ''), notes: String(r.notes ?? ''), tags: String(r.tags ?? ''), createdBy: String(r.created_by ?? ''), updatedAt: String(r.updated_at ?? '') });
export const listContacts = async (q = '', limit = 200): Promise<import('./models').Contact[]> => { const like = `%${q}%`; return ((q ? await all('SELECT * FROM contacts WHERE name ILIKE ? OR org ILIKE ? OR role ILIKE ? OR tags ILIKE ? OR notes ILIKE ? ORDER BY name LIMIT ?', [like, like, like, like, like, limit]) : await all('SELECT * FROM contacts ORDER BY name LIMIT ?', [limit])) as Row[]).map(rowToContact); };
export const findContact = async (id: string): Promise<import('./models').Contact | undefined> => { const r = (await get('SELECT * FROM contacts WHERE id = ?', [id])) as Row | undefined; return r ? rowToContact(r) : undefined; };
export async function upsertContact(c: import('./models').Contact): Promise<void> { await run('INSERT INTO contacts (id, name, role, org, phone, email, notes, tags, created_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET name = excluded.name, role = excluded.role, org = excluded.org, phone = excluded.phone, email = excluded.email, notes = excluded.notes, tags = excluded.tags, updated_at = excluded.updated_at', [c.id, c.name, c.role, c.org, c.phone, c.email, c.notes, c.tags, c.createdBy, c.updatedAt]); }
export async function deleteContact(id: string): Promise<void> { await run('DELETE FROM contacts WHERE id = ?', [id]); }

// ---------------- Regali, quiz, profilo lettore ----------------
const rowToGift = (r: Row): import('./models').GiftCode => ({ id: String(r.id), code: String(r.code), email: String(r.email), months: Number(r.months ?? 1), message: String(r.message ?? ''), fromReader: String(r.from_reader ?? ''), redeemedBy: String(r.redeemed_by ?? ''), createdAt: String(r.created_at ?? ''), redeemedAt: (r.redeemed_at as string | null) ?? null });
export async function insertGift(g: import('./models').GiftCode): Promise<void> { await run('INSERT INTO gift_codes (id, code, email, months, message, from_reader, redeemed_by, created_at, redeemed_at) VALUES (?,?,?,?,?,?,?,?,?)', [g.id, g.code, g.email, g.months, g.message, g.fromReader, g.redeemedBy, g.createdAt, g.redeemedAt]); }
export const findGift = async (code: string): Promise<import('./models').GiftCode | undefined> => { const r = (await get('SELECT * FROM gift_codes WHERE code = ?', [code])) as Row | undefined; return r ? rowToGift(r) : undefined; };
export async function redeemGift(id: string, readerId: string): Promise<void> { await run('UPDATE gift_codes SET redeemed_by = ?, redeemed_at = ? WHERE id = ?', [readerId, new Date().toISOString(), id]); }
export async function upsertQuizResult(q: import('./models').QuizResult): Promise<void> { await run('INSERT INTO quiz_results (id, quiz_id, article_id, who, name, score, total, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (quiz_id, who) DO UPDATE SET score = GREATEST(quiz_results.score, excluded.score), name = excluded.name, created_at = excluded.created_at', [q.id, q.quizId, q.articleId, q.who, q.name, q.score, q.total, q.createdAt]); }
export const quizLeaderboard = async (quizId: string, limit = 10): Promise<import('./models').QuizResult[]> => (await all('SELECT * FROM quiz_results WHERE quiz_id = ? ORDER BY score DESC, created_at ASC LIMIT ?', [quizId, limit]) as Row[]).map((r) => ({ id: String(r.id), quizId: String(r.quiz_id), articleId: String(r.article_id ?? ''), who: String(r.who), name: String(r.name ?? ''), score: Number(r.score ?? 0), total: Number(r.total ?? 0), createdAt: String(r.created_at ?? '') }));
export const readerComments = async (readerId: string, limit = 20): Promise<import('./models').Comment[]> => { const { rowToComment } = await import('./repo'); return (await all("SELECT * FROM comments WHERE reader_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT ?", [readerId, limit]) as Row[]).map(rowToComment); };
export const countReaderComments = async (readerId: string): Promise<number> => Number((await get("SELECT COUNT(*) c FROM comments WHERE reader_id = ? AND status = 'approved'", [readerId]) as Row).c);

// ---------------- Web Vitals reali, consensi ----------------
export async function insertVital(path: string, metric: string, value: number, device: string): Promise<void> { await run('INSERT INTO vitals (id, path, metric, value, device, created_at) VALUES (?,?,?,?,?,?)', ['v' + Math.random().toString(36).slice(2, 12), path, metric, value, device, new Date().toISOString()]); if (Math.random() < 0.02) await run('DELETE FROM vitals WHERE created_at < ?', [new Date(Date.now() - 30 * 86400000).toISOString()]); }
export async function vitalsSummary(days = 7): Promise<{ samples: number; p75: Record<string, Record<string, number>>; worst: { path: string; value: number; n: number }[] }> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = (await all('SELECT path, metric, value, device FROM vitals WHERE created_at > ? ORDER BY created_at DESC LIMIT 20000', [since])) as { path: string; metric: string; value: number; device: string }[];
  const p75 = (vals: number[]) => { if (!vals.length) return undefined; const s = [...vals].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))]; };
  const out: Record<string, Record<string, number>> = { mobile: {}, desktop: {} };
  for (const d of ['mobile', 'desktop']) for (const m of ['LCP', 'INP', 'CLS', 'TTFB', 'FCP']) { const v = p75(rows.filter((r) => r.device === d && r.metric === m).map((r) => Number(r.value))); if (v !== undefined) out[d][m] = v; }
  const byPath = new Map<string, number[]>(); for (const r of rows) if (r.metric === 'LCP' && r.device === 'mobile') byPath.set(r.path, [...(byPath.get(r.path) ?? []), Number(r.value)]);
  const worst = [...byPath.entries()].filter(([, v]) => v.length >= 3).map(([path, v]) => ({ path, value: p75(v)!, n: v.length })).sort((a, b) => b.value - a.value).slice(0, 8);
  return { samples: rows.length, p75: out, worst };
}
export async function insertConsent(choice: string, version: number, ipHash: string, ua: string): Promise<void> { await run('INSERT INTO consents (id, choice, version, ip_hash, ua, created_at) VALUES (?,?,?,?,?,?)', ['c' + Math.random().toString(36).slice(2, 12), choice, version, ipHash, ua.slice(0, 160), new Date().toISOString()]); }
export const listConsents = async (limit = 10000): Promise<{ id: string; choice: string; version: number; ipHash: string; ua: string; createdAt: string }[]> => (await all('SELECT * FROM consents ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map((r) => ({ id: String(r.id), choice: String(r.choice), version: Number(r.version ?? 1), ipHash: String(r.ip_hash ?? ''), ua: String(r.ua ?? ''), createdAt: String(r.created_at ?? '') }));
export async function consentStats(): Promise<{ all: number; necessary: number; total: number }> { const since = new Date(Date.now() - 30 * 86400000).toISOString(); const c = async (sql: string, args: unknown[]) => Number((await get(sql, args) as Row).c); return { all: await c("SELECT COUNT(*) c FROM consents WHERE choice = 'all' AND created_at > ?", [since]), necessary: await c("SELECT COUNT(*) c FROM consents WHERE choice = 'necessary' AND created_at > ?", [since]), total: await c('SELECT COUNT(*) c FROM consents', []) }; }

// ---------------- Argomenti seguiti e biglietti ----------------
const rowToFollow = (r: Row): import('./models').TagFollow => ({ id: String(r.id), tagId: String(r.tag_id), email: String(r.email), readerId: String(r.reader_id ?? ''), token: String(r.token), createdAt: String(r.created_at ?? '') });
export async function upsertFollow(f: import('./models').TagFollow): Promise<void> { await run('INSERT INTO tag_follows (id, tag_id, email, reader_id, token, created_at) VALUES (?,?,?,?,?,?) ON CONFLICT (tag_id, email) DO NOTHING', [f.id, f.tagId, f.email, f.readerId, f.token, f.createdAt]); }
export async function deleteFollow(tagId: string, email: string): Promise<void> { await run('DELETE FROM tag_follows WHERE tag_id = ? AND email = ?', [tagId, email]); }
export async function deleteFollowByToken(token: string): Promise<boolean> { const r = await get('SELECT id FROM tag_follows WHERE token = ?', [token]); if (!r) return false; await run('DELETE FROM tag_follows WHERE token = ?', [token]); return true; }
export const followersOfTags = async (tagIds: string[], limit = 300): Promise<import('./models').TagFollow[]> => (tagIds.length ? (await all(`SELECT * FROM tag_follows WHERE tag_id IN (${tagIds.map(() => '?').join(',')}) LIMIT ?`, [...tagIds, limit]) as Row[]).map(rowToFollow) : []);
export const followsOfEmail = async (email: string): Promise<import('./models').TagFollow[]> => (await all('SELECT * FROM tag_follows WHERE email = ? ORDER BY created_at DESC', [email]) as Row[]).map(rowToFollow);
const rowToTicket = (r: Row): import('./models').Ticket => ({ id: String(r.id), eventId: String(r.event_id), name: String(r.name ?? ''), email: String(r.email), qty: Number(r.qty ?? 1), code: String(r.code), status: (r.status as 'pending' | 'paid') ?? 'pending', amount: Number(r.amount ?? 0), createdAt: String(r.created_at ?? ''), usedAt: (r.used_at as string | null) ?? null });
export async function insertTicket(t: import('./models').Ticket): Promise<void> { await run('INSERT INTO tickets (id, event_id, name, email, qty, code, status, amount, created_at, used_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [t.id, t.eventId, t.name, t.email, t.qty, t.code, t.status, t.amount, t.createdAt, t.usedAt]); }
export async function markTicketPaid(id: string): Promise<import('./models').Ticket | null> { const r = (await get('SELECT * FROM tickets WHERE id = ?', [id])) as Row | undefined; if (!r || r.status === 'paid') return null; await run("UPDATE tickets SET status = 'paid' WHERE id = ?", [id]); return { ...rowToTicket(r), status: 'paid' }; }
export const findTicketByCode = async (code: string): Promise<import('./models').Ticket | undefined> => { const r = (await get('SELECT * FROM tickets WHERE code = ?', [code])) as Row | undefined; return r ? rowToTicket(r) : undefined; };
export async function useTicket(id: string): Promise<void> { await run('UPDATE tickets SET used_at = ? WHERE id = ?', [new Date().toISOString(), id]); }
export const listTickets = async (limit = 300): Promise<import('./models').Ticket[]> => (await all('SELECT * FROM tickets ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map(rowToTicket);

// ---------------- Ordini pubblicitari self-service ----------------
const rowToAdOrder = (r: Row): import('./models').AdOrder => ({ id: String(r.id), adId: String(r.ad_id), company: String(r.company ?? ''), email: String(r.email), amount: Number(r.amount ?? 0), days: Number(r.days ?? 0), status: (r.status as 'pending' | 'paid') ?? 'pending', createdAt: String(r.created_at ?? '') });
export async function insertAdOrder(o: import('./models').AdOrder): Promise<void> { await run('INSERT INTO ad_orders (id, ad_id, company, email, amount, days, status, created_at) VALUES (?,?,?,?,?,?,?,?)', [o.id, o.adId, o.company, o.email, o.amount, o.days, o.status, o.createdAt]); }
export async function markAdOrderPaid(id: string): Promise<import('./models').AdOrder | null> { const r = (await get('SELECT * FROM ad_orders WHERE id = ?', [id])) as Row | undefined; if (!r || r.status === 'paid') return null; await run("UPDATE ad_orders SET status = 'paid' WHERE id = ?", [id]); return { ...rowToAdOrder(r), status: 'paid' }; }
export const listAdOrders = async (limit = 100): Promise<import('./models').AdOrder[]> => (await all('SELECT * FROM ad_orders ORDER BY created_at DESC LIMIT ?', [limit]) as Row[]).map(rowToAdOrder);
