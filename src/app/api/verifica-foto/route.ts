import { NextResponse } from 'next/server';
import { createPrivateKey, sign } from 'node:crypto';
import { listMedia } from '@/lib/repo';
import { get } from '@/lib/db';
import { publicKeyPem } from '@/lib/signing';

export const dynamic = 'force-dynamic';
/** Firma delle foto: dato l'impronta (SHA-1 del file originale) o l'indirizzo, dice se la foto è nostra, quando è stata caricata, con quale credito, e firma la risposta con la chiave del sito. */
export async function GET(req: Request) {
  const u = new URL(req.url); const hash = (u.searchParams.get('hash') ?? '').toLowerCase().replace(/[^a-f0-9]/g, ''); const url = u.searchParams.get('url') ?? '';
  if (!hash && !url) return NextResponse.json({ error: 'Serve hash o url' }, { status: 400 });
  const media = await listMedia(5000, ''); const m = media.find((x) => (hash && x.hash === hash) || (url && (x.url === url || Object.values(x.variants ?? {}).includes(url))));
  if (!m) return NextResponse.json({ known: false, publicKey: await publicKeyPem() });
  const row = (await get("SELECT value FROM settings WHERE key = 'signing'")) as { value: string } | undefined; const priv = row ? (JSON.parse(row.value) as { privateKey: string }).privateKey : null; const claim = `photo:${m.hash}:${m.createdAt}`; const signature = priv ? sign(null, Buffer.from(claim), createPrivateKey(priv)).toString('base64') : null;
  return NextResponse.json({ known: true, id: m.id, hash: m.hash, uploadedAt: m.createdAt, credit: m.credit || null, license: m.license || null, exclusive: !!m.exclusive, claim, signature, publicKey: await publicKeyPem() });
}
