import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { User } from './models';
import { findUser } from './repo';
import { can, Permission } from './permissions';

export const SESSION_COOKIE = 'aster_session';
export const DEMO_PASSWORD = 'aster2026';
const SECRET = process.env.AUTH_SECRET ?? 'aster-news-dev-secret-cambiami';

function sign(v: string): string { return createHmac('sha256', SECRET).update(v).digest('base64url'); }
export function createSessionToken(userId: string): string { return `${userId}.${sign(userId)}`; }
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const id = token.slice(0, i); const sig = token.slice(i + 1); const expected = sign(id);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? id : null;
}

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const id = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  const u = id ? await findUser(id) : undefined;
  return u && u.active ? u : null;
});
export async function requireUser(): Promise<User> { const u = await getCurrentUser(); if (!u) redirect('/login'); return u; }
export async function requirePermission(p: Permission): Promise<User> { const u = await requireUser(); if (!can(u, p)) throw new Error('Permesso negato'); return u; }
