import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { Reader, Session, User } from './models';
import { findUser } from './repo';
import { findReader, findSession, insertSession, touchSession } from './repo-extra';
import { metaGet, metaSet } from './db';
import { hmac, randomToken, safeEqual } from './security';
import { can, Permission } from './permissions';

export const SESSION_COOKIE = 'aster_session';
export const READER_COOKIE = 'aster_reader';
export const TWOFA_COOKIE = 'aster_2fa';
const STAFF_DAYS = 14; const READER_DAYS = 90;

/** Segreto per le firme: AUTH_SECRET dall'ambiente oppure generato una volta e salvato nel database. */
let secretCache: string | null = null;
export async function getSecret(): Promise<string> {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (secretCache) return secretCache;
  let s = await metaGet('auth_secret');
  if (!s) { s = randomToken(48); await metaSet('auth_secret', s); }
  secretCache = s;
  return s;
}
async function sign(v: string): Promise<string> { return hmac(await getSecret(), v); }
async function verifySigned(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const i = token.lastIndexOf('.'); if (i < 0) return null;
  const id = token.slice(0, i); const sig = token.slice(i + 1);
  return safeEqual(sig, await sign(id)) ? id : null;
}

async function requestInfo(): Promise<{ ua: string; ip: string }> {
  try { const h = await headers(); return { ua: h.get('user-agent') ?? '', ip: (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0].trim() }; } catch { return { ua: '', ip: '' }; }
}
export async function clientIp(): Promise<string> { return (await requestInfo()).ip; }

/** Crea una sessione persistente (revocabile) e imposta il cookie firmato. */
export async function startSession(userId: string, kind: Session['kind'] = 'staff'): Promise<string> {
  const { ua, ip } = await requestInfo();
  const days = kind === 'staff' ? STAFF_DAYS : READER_DAYS;
  const s: Session = { id: randomToken(24), userId, kind, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString(), expiresAt: new Date(Date.now() + days * 86400000).toISOString(), userAgent: ua, ip, revoked: false };
  await insertSession(s);
  (await cookies()).set(kind === 'staff' ? SESSION_COOKIE : READER_COOKIE, `${s.id}.${await sign(s.id)}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: days * 86400, secure: process.env.NODE_ENV === 'production' });
  return s.id;
}
export async function endSession(kind: Session['kind'] = 'staff'): Promise<void> {
  const store = await cookies(); const name = kind === 'staff' ? SESSION_COOKIE : READER_COOKIE;
  const id = await verifySigned(store.get(name)?.value);
  if (id) { const { revokeSession } = await import('./repo-extra'); await revokeSession(id); }
  store.delete(name);
}
export const currentSession = cache(async (kind: Session['kind'] = 'staff'): Promise<Session | null> => {
  const store = await cookies();
  const id = await verifySigned(store.get(kind === 'staff' ? SESSION_COOKIE : READER_COOKIE)?.value);
  if (!id) return null;
  const s = await findSession(id);
  if (!s || s.revoked || s.kind !== kind || s.expiresAt < new Date().toISOString()) return null;
  if (Date.now() - new Date(s.lastSeen).getTime() > 5 * 60_000) touchSession(id).catch(() => {});
  return s;
});

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const s = await currentSession('staff');
  const u = s ? await findUser(s.userId) : undefined;
  return u && u.active ? u : null;
});
export const getCurrentReader = cache(async (): Promise<Reader | null> => {
  const s = await currentSession('reader');
  const r = s ? await findReader(s.userId) : undefined;
  return r && !r.banned ? r : null;
});
export async function requireUser(): Promise<User> { const u = await getCurrentUser(); if (!u) redirect('/login'); return u; }
export async function requirePermission(p: Permission): Promise<User> { const u = await requireUser(); if (!can(u, p)) throw new Error('Permesso negato'); return u; }

/** Cookie temporaneo (5 minuti) tra password corretta e codice 2FA. */
export async function setTwoFactorPending(userId: string, redirectTo: string): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ u: userId, r: redirectTo, e: Date.now() + 5 * 60_000 })).toString('base64url');
  (await cookies()).set(TWOFA_COOKIE, `${payload}.${await sign(payload)}`, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 300, secure: process.env.NODE_ENV === 'production' });
}
export async function readTwoFactorPending(): Promise<{ userId: string; redirectTo: string } | null> {
  const payload = await verifySigned((await cookies()).get(TWOFA_COOKIE)?.value);
  if (!payload) return null;
  try { const d = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { u: string; r: string; e: number }; return d.e > Date.now() ? { userId: d.u, redirectTo: d.r } : null; } catch { return null; }
}
export async function clearTwoFactorPending(): Promise<void> { (await cookies()).delete(TWOFA_COOKIE); }

/** Token firmati per link via email (conferma iscrizione, reset password): `${id}.${firma}`. */
export async function signedToken(id: string): Promise<string> { return `${id}.${await sign(id)}`; }
export async function verifySignedToken(t: string | undefined): Promise<string | null> { return verifySigned(t); }
