import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { insertMedia } from '@/lib/repo';
import { suggestAlt, uploadImage } from '@/lib/storage';
import { MediaItem } from '@/lib/models';
import { uid } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Caricamento immagini: corpo grezzo + intestazioni X-File-Name / Content-Type. Ridimensiona, converte in WebP e salva nello storage configurato. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, 'media.manage')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  const mime = (req.headers.get('content-type') ?? 'application/octet-stream').split(';')[0];
  if (!mime.startsWith('image/')) return NextResponse.json({ error: 'Sono ammesse solo immagini.' }, { status: 415 });
  const name = decodeURIComponent(req.headers.get('x-file-name') ?? 'immagine.jpg');
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: 'File vuoto.' }, { status: 400 });
  if (buf.length > 30 * 1024 * 1024) return NextResponse.json({ error: 'Massimo 30 MB.' }, { status: 413 });
  try {
    const f = await uploadImage(buf, name, mime);
    const item: MediaItem = { id: uid('m'), name, url: f.url, alt: suggestAlt(name), type: 'image', size: f.size, uploadedBy: me.id, createdAt: new Date().toISOString(), provider: f.provider, path: f.path, width: f.width, height: f.height, variants: f.variants, focalX: 0.5, focalY: 0.5 };
    await insertMedia(item);
    return NextResponse.json(item);
  } catch (e) {
    console.error('[media/upload]', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
