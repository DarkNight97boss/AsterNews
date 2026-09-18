import 'server-only';
import { all, get, run } from './db';
import * as repo from './repo';
import { getSettings } from './queries';
import { uid } from './utils';

/** Registro di sicurezza: accessi riusciti e falliti con IP, dispositivo e paese; avvisi su accessi anomali. */
export interface SecurityEntry { id: string; kind: 'login_ok' | 'login_failed' | 'sso_ok' | 'password_reset' | 'totp_failed'; email: string; userId: string; ip: string; ua: string; country: string; createdAt: string }
const geoCache = new Map<string, string>();
async function country(ip: string): Promise<string> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.')) return 'locale';
  if (geoCache.has(ip)) return geoCache.get(ip)!;
  try { const r = await fetch(`https://ipapi.co/${ip}/country_name/`, { signal: AbortSignal.timeout(3000) }); const t = (await r.text()).trim(); const c = r.ok && t && !/error|Undefined/i.test(t) ? t.slice(0, 40) : ''; geoCache.set(ip, c); return c; } catch { return ''; }
}
export async function logSecurity(kind: SecurityEntry['kind'], email: string, userId: string, ip: string, ua: string): Promise<void> {
  const s = await getSettings(); const geo = (s.privacy?.geoLookup ?? true) ? await country(ip) : '';
  const e: SecurityEntry = { id: uid('sl'), kind, email: email.toLowerCase().slice(0, 120), userId, ip: ip.slice(0, 60), ua: ua.slice(0, 200), country: geo, createdAt: new Date().toISOString() };
  await run('INSERT INTO security_log (id, kind, email, user_id, ip, ua, country, created_at) VALUES (?,?,?,?,?,?,?,?)', [e.id, e.kind, e.email, e.userId, e.ip, e.ua, e.country, e.createdAt]);
  await run("DELETE FROM security_log WHERE created_at < ?", [new Date(Date.now() - 90 * 86400000).toISOString()]).catch(() => {});
  try { await detectAnomaly(e); } catch { /* mai bloccare il login */ }
}
async function detectAnomaly(e: SecurityEntry): Promise<void> {
  const problems: string[] = [];
  if (e.kind === 'login_failed') { const n = Number(((await get("SELECT COUNT(*) c FROM security_log WHERE kind = 'login_failed' AND email = ? AND created_at > ?", [e.email, new Date(Date.now() - 600000).toISOString()])) as { c: number }).c); if (n === 5) problems.push(`5 accessi falliti in 10 minuti per ${e.email} (IP ${e.ip}${e.country ? ', ' + e.country : ''})`); }
  if ((e.kind === 'login_ok' || e.kind === 'sso_ok') && e.country && e.country !== 'locale') { const prev = (await all("SELECT DISTINCT country FROM security_log WHERE user_id = ? AND kind IN ('login_ok','sso_ok') AND country <> '' AND id <> ? ORDER BY country", [e.userId, e.id])) as { country: string }[]; if (prev.length && !prev.some((p) => p.country === e.country)) problems.push(`Accesso di ${e.email} da un paese nuovo: ${e.country} (IP ${e.ip})`); }
  if (!problems.length) return;
  const s = await getSettings(); const admins = (await repo.listUsers()).filter((u) => u.role === 'admin' && u.active); const x3 = await import('./repo-extra3');
  for (const a of admins) await x3.insertNotification({ id: uid('nt'), userId: a.id, kind: 'security', text: `🔐 ${problems[0]}`, url: '/admin/sicurezza', read: false, createdAt: new Date().toISOString() }).catch(() => {});
  const mon = s.monitoring; if (mon?.alertEmail) { const { mailConfigured, mailLayout, sendMail } = await import('./mailer'); if (await mailConfigured()) sendMail({ to: mon.alertEmail, subject: `🔐 Avviso sicurezza ${s.siteName}`, html: mailLayout(s.siteName, 'Accesso anomalo', `<ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>`) }).catch(() => {}); }
  if (mon?.webhookUrl) fetch(mon.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: problems.join('; ') }) }).catch(() => {});
}
export const listSecurity = async (limit = 200): Promise<SecurityEntry[]> => ((await all('SELECT * FROM security_log ORDER BY created_at DESC LIMIT ?', [limit])) as Record<string, unknown>[]).map((r) => ({ id: String(r.id), kind: r.kind as SecurityEntry['kind'], email: String(r.email ?? ''), userId: String(r.user_id ?? ''), ip: String(r.ip ?? ''), ua: String(r.ua ?? ''), country: String(r.country ?? ''), createdAt: String(r.created_at ?? '') }));
export async function securityStats(): Promise<{ ok: number; failed: number; countries: { country: string; n: number }[] }> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const ok = Number(((await get("SELECT COUNT(*) c FROM security_log WHERE kind IN ('login_ok','sso_ok') AND created_at > ?", [since])) as { c: number }).c);
  const failed = Number(((await get("SELECT COUNT(*) c FROM security_log WHERE kind = 'login_failed' AND created_at > ?", [since])) as { c: number }).c);
  const countries = (await all("SELECT country, COUNT(*) n FROM security_log WHERE country <> '' AND created_at > ? GROUP BY country ORDER BY n DESC LIMIT 10", [since])) as { country: string; n: number }[];
  return { ok, failed, countries: countries.map((c) => ({ country: c.country, n: Number(c.n) })) };
}
