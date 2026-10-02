import { oneKb } from '@/lib/platform';
import { getPublished, getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';
/** La pagina da un kilobyte: titoli e link, per quando la rete è quasi morta. */
export async function GET() { const [s, arts] = await Promise.all([getSettings(), getPublished(25)]); return new Response(oneKb(s.siteName, arts.map((a) => ({ title: a.title, url: `/1k/${a.id}` }))), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120' } }); }
