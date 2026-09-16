import { recordNewsletterEvent } from '@/lib/repo-extra2';

export const dynamic = 'force-dynamic';
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
/** Pixel di apertura newsletter. */
export async function GET(req: Request) {
  const u = new URL(req.url); const s = u.searchParams.get('s') ?? ''; const r = u.searchParams.get('r') ?? '';
  if (s && r && s !== 'test') recordNewsletterEvent(s, r, 'open').catch(() => {});
  return new Response(new Uint8Array(PIXEL), { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, private' } });
}
