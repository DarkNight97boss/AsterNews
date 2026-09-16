import 'server-only';
import { cookies } from 'next/headers';
import * as x from './repo-extra';
import { DEFAULT_AUTH, AuthSettings, Reader } from './models';
import { getSettings } from './queries';
import { randomToken } from './security';
import { siteUrl } from './site-url';
import { startSession } from './auth';
import { uid } from './utils';

export type Provider = 'google' | 'facebook';
export async function authSettings(): Promise<AuthSettings> {
  const s = { ...DEFAULT_AUTH, ...((await getSettings()).auth ?? {}) };
  if (!s.googleClientId && process.env.GOOGLE_CLIENT_ID) { s.googleClientId = process.env.GOOGLE_CLIENT_ID; s.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''; }
  if (!s.facebookAppId && process.env.FACEBOOK_APP_ID) { s.facebookAppId = process.env.FACEBOOK_APP_ID; s.facebookAppSecret = process.env.FACEBOOK_APP_SECRET ?? ''; }
  return s;
}
export async function availableProviders(): Promise<Provider[]> { const s = await authSettings(); const out: Provider[] = []; if (s.googleClientId && s.googleClientSecret) out.push('google'); if (s.facebookAppId && s.facebookAppSecret) out.push('facebook'); return out; }
const redirectUri = (p: Provider) => `${siteUrl()}/api/auth/${p}/callback`;

/** URL di autorizzazione con stato anti-CSRF salvato nel cookie. */
export async function authorizeUrl(p: Provider, back: string): Promise<string> {
  const s = await authSettings(); const state = randomToken(16);
  (await cookies()).set('aster_oauth', JSON.stringify({ state, back, p }), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' });
  if (p === 'google') return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: s.googleClientId, redirect_uri: redirectUri('google'), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' })}`;
  return `https://www.facebook.com/v21.0/dialog/oauth?${new URLSearchParams({ client_id: s.facebookAppId, redirect_uri: redirectUri('facebook'), state, scope: 'email,public_profile' })}`;
}
/** Scambia il codice, legge il profilo, crea o collega il lettore e apre la sessione. Ritorna il percorso di ritorno. */
export async function handleCallback(p: Provider, code: string, state: string): Promise<string> {
  const store = await cookies(); const raw = store.get('aster_oauth')?.value; store.delete('aster_oauth');
  const saved = raw ? JSON.parse(raw) as { state: string; back: string; p: Provider } : null;
  if (!saved || saved.state !== state || saved.p !== p) throw new Error('Stato OAuth non valido: riprova.');
  const s = await authSettings();
  let profile: { email: string; name: string; avatar: string; id: string };
  if (p === 'google') {
    const t = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: s.googleClientId, client_secret: s.googleClientSecret, redirect_uri: redirectUri('google'), grant_type: 'authorization_code' }) });
    const td = await t.json() as { access_token?: string; error_description?: string };
    if (!td.access_token) throw new Error(td.error_description ?? 'Google: token non ricevuto');
    const u = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${td.access_token}` } })).json() as { sub: string; email?: string; name?: string; picture?: string; email_verified?: boolean };
    if (!u.email || u.email_verified === false) throw new Error('Google non ha fornito un\'email verificata.');
    profile = { email: u.email, name: u.name ?? '', avatar: u.picture ?? '', id: u.sub };
  } else {
    const t = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${new URLSearchParams({ client_id: s.facebookAppId, client_secret: s.facebookAppSecret, redirect_uri: redirectUri('facebook'), code })}`);
    const td = await t.json() as { access_token?: string; error?: { message: string } };
    if (!td.access_token) throw new Error(td.error?.message ?? 'Facebook: token non ricevuto');
    const u = await (await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.width(200)&access_token=${td.access_token}`)).json() as { id: string; name?: string; email?: string; picture?: { data?: { url?: string } } };
    if (!u.email) throw new Error('Facebook non ha fornito l\'email: usa un altro metodo di accesso.');
    profile = { email: u.email, name: u.name ?? '', avatar: u.picture?.data?.url ?? '', id: u.id };
  }
  const email = profile.email.toLowerCase();
  let reader = await x.findReaderByEmail(email);
  if (reader?.banned) throw new Error('Account sospeso.');
  if (!reader) { const r: Reader = { id: uid('rd'), email, name: profile.name, verified: true, premium: false, premiumUntil: null, stripeCustomer: '', banned: false, createdAt: new Date().toISOString(), lastLogin: null }; await x.insertReader(r, null); reader = r; }
  await x.updateReader(reader.id, { verified: true, lastLogin: new Date().toISOString(), ...(reader.name ? {} : { name: profile.name }) });
  const { run } = await import('./db'); await run('UPDATE readers SET provider = ?, avatar = ? WHERE id = ?', [p, profile.avatar, reader.id]);
  await startSession(reader.id, 'reader');
  return saved.back && saved.back.startsWith('/') ? saved.back : '/account';
}
