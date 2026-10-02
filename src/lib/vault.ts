import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { getSecret } from './auth';

/** Cassaforte: AES-256-GCM con chiave derivata dal segreto del sito. Per il registro delle fonti anonime: il database non contiene mai il testo in chiaro. */
const key = async () => createHash('sha256').update(`vault:${await getSecret()}`).digest();
export async function seal(text: string): Promise<string> { const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', await key(), iv); const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]); return `${iv.toString('base64')}.${c.getAuthTag().toString('base64')}.${enc.toString('base64')}`; }
export async function open(blob: string): Promise<string> { const [iv, tag, enc] = blob.split('.').map((x) => Buffer.from(x, 'base64')); const d = createDecipheriv('aes-256-gcm', await key(), iv); d.setAuthTag(tag); return Buffer.concat([d.update(enc), d.final()]).toString('utf8'); }
