import { bumpAd } from '@/lib/repo-extra2';

export const dynamic = 'force-dynamic';
/** Impressione di un annuncio (beacon). */
export async function POST(req: Request) {
  const { id } = await req.json().catch(() => ({ id: '' })) as { id?: string };
  if (id) bumpAd(id, 'impressions').catch(() => {});
  return new Response(null, { status: 204 });
}
