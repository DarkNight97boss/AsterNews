import { NextResponse } from 'next/server';
import { bumpAd, findAd } from '@/lib/repo-extra2';

export const dynamic = 'force-dynamic';
/** Clic su un annuncio: conteggio e redirect. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const ad = id ? await findAd(id) : undefined;
  if (!ad || !ad.url) return NextResponse.redirect(new URL('/', req.url));
  bumpAd(id, 'clicks').catch(() => {});
  return NextResponse.redirect(ad.url, 302);
}
