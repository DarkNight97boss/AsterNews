import { getPublished, getSettings } from '@/lib/queries';
import { voiceTwiml } from '@/lib/school';
import { listRecords } from '@/lib/records';

export const dynamic = 'force-dynamic';
/** Telefono fisso: risposta per un numero vocale (Twilio o compatibile) che legge le notizie del giorno. Il numero si collega in Impostazioni → Scuola e accessibilità. */
export async function GET() { const [s, arts, radio] = await Promise.all([getSettings(), getPublished(6), listRecords<{ url: string }>('radio', { limit: 1 })]); return new Response(voiceTwiml(s.siteName, arts.filter((a) => !a.premium).map((a) => ({ title: a.title, excerpt: a.excerpt || a.subtitle })), radio[0]?.data.url), { headers: { 'Content-Type': 'text/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600' } }); }
export const POST = GET;
