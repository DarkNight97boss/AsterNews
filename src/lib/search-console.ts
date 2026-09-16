import 'server-only';
import { createSign } from 'node:crypto';
import { getSettings } from './queries';

/** Google Search Console via account di servizio (JSON): query, clic, impressioni, pagine premiate da Discover. Nessuna libreria: JWT firmato con node:crypto. */
interface SA { client_email: string; private_key: string }
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
export async function gscConfig(): Promise<{ sa: SA | null; site: string }> {
  const s = await getSettings(); const seo = (s.seo ?? {}) as { gscServiceAccount?: string; gscSiteUrl?: string };
  let sa: SA | null = null; try { if (seo.gscServiceAccount) sa = JSON.parse(seo.gscServiceAccount); } catch { sa = null; }
  return { sa, site: seo.gscSiteUrl ?? '' };
}
async function accessToken(sa: SA): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  const j = await r.json(); if (!r.ok) throw new Error(j.error_description ?? 'Token Google non ottenuto'); return j.access_token;
}
export interface GscRow { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }
export async function gscQuery(dimension: 'query' | 'page' | 'date', days = 28, type: 'web' | 'discover' | 'news' = 'web', limit = 25): Promise<GscRow[]> {
  const { sa, site } = await gscConfig(); if (!sa || !site) throw new Error('Search Console non configurata: incolla il JSON dell\'account di servizio e l\'URL della proprietà in Impostazioni → SEO.');
  const token = await accessToken(sa); const end = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10); const start = new Date(Date.now() - (days + 2) * 86400000).toISOString().slice(0, 10);
  const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: start, endDate: end, dimensions: [dimension], rowLimit: limit, type, ...(dimension === 'date' ? {} : { orderBy: [{ field: 'clicks', descending: true }] }) }), signal: AbortSignal.timeout(20_000) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message ?? `Search Console ${r.status}`);
  return (j.rows ?? []) as GscRow[];
}
