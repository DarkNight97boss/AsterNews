import 'server-only';
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { get, run } from './db';
import { textHash } from './trust';

/** Firma crittografica degli articoli (Ed25519). La chiave privata resta nel database, fuori dalle impostazioni del sito; la pubblica è esposta in /api/verify. */
interface Keys { publicKey: string; privateKey: string }
let cached: Keys | null = null;
async function keys(): Promise<Keys> {
  if (cached) return cached; const row = (await get("SELECT value FROM settings WHERE key = 'signing'")) as { value: string } | undefined;
  if (row) { cached = JSON.parse(row.value) as Keys; return cached; }
  const k = generateKeyPairSync('ed25519'); cached = { publicKey: k.publicKey.export({ type: 'spki', format: 'pem' }).toString(), privateKey: k.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() };
  await run("INSERT INTO settings (key, value) VALUES ('signing', ?) ON CONFLICT(key) DO NOTHING", [JSON.stringify(cached)]); return cached;
}
export const publicKeyPem = async (): Promise<string> => (await keys()).publicKey;
export async function signArticle(title: string, html: string): Promise<{ hash: string; sig: string; at: string }> { const hash = textHash(title, html); const k = await keys(); return { hash, sig: sign(null, Buffer.from(hash), createPrivateKey(k.privateKey)).toString('base64'), at: new Date().toISOString() }; }
export async function verifyArticle(title: string, html: string, signature?: { hash: string; sig: string }): Promise<{ signed: boolean; intact: boolean; authentic: boolean }> {
  if (!signature) return { signed: false, intact: false, authentic: false }; const k = await keys();
  let authentic = false; try { authentic = verify(null, Buffer.from(signature.hash), createPublicKey(k.publicKey), Buffer.from(signature.sig, 'base64')); } catch { /* firma malformata */ }
  return { signed: true, intact: textHash(title, html) === signature.hash, authentic };
}
