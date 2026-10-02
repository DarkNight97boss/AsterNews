import { getPublished, getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';
/** La stessa segreteria in testo semplice: per chi la legge a voce o per sistemi che non parlano TwiML. */
export async function GET() { const [s, arts] = await Promise.all([getSettings(), getPublished(6)]); return new Response(`${s.siteName} · notiziario telefonico · ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n${arts.filter((a) => !a.premium).map((a, i) => `${i + 1}. ${a.title}\n${a.excerpt || a.subtitle}`).join('\n\n')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' } }); }
