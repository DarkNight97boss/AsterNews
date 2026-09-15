import 'server-only';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** Hash password con scrypt (nessuna dipendenza esterna). Formato: scrypt$N$salt$hash */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password.normalize('NFKC'), salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64url');
  return `scrypt$16384$${salt}$${hash}`;
}
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [algo, n, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const calc = scryptSync(password.normalize('NFKC'), salt, 64, { N: Number(n) || 16384, r: 8, p: 1 });
  const expected = Buffer.from(hash, 'base64url');
  return calc.length === expected.length && timingSafeEqual(calc, expected);
}
export function passwordStrength(p: string): { ok: boolean; message: string } {
  if (p.length < 10) return { ok: false, message: 'La password deve avere almeno 10 caratteri.' };
  if (!/[a-z]/.test(p) || !/[A-Z0-9]/.test(p)) return { ok: false, message: 'Usa lettere minuscole e almeno una maiuscola o una cifra.' };
  return { ok: true, message: '' };
}
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

// ---------------- TOTP (RFC 6238) per la verifica in due passaggi ----------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) { value = (value << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
export const generateTotpSecret = (): string => base32Encode(randomBytes(20));
export function totpCode(secret: string, step = Math.floor(Date.now() / 30000)): string {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const off = h[h.length - 1] & 0xf;
  const code = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(code % 1_000_000).padStart(6, '0');
}
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const c = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (let i = -window; i <= window; i++) if (timingSafeEqual(Buffer.from(totpCode(secret, now + i)), Buffer.from(c))) return true;
  return false;
}
export const totpUri = (issuer: string, account: string, secret: string): string => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

/** Firma HMAC (base64url) con un segreto. */
export const hmac = (secret: string, v: string): string => createHmac('sha256', secret).update(v).digest('base64url');
export function safeEqual(a: string, b: string): boolean { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
