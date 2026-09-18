import { ImageResponse } from 'next/og';
import { findArticle } from '@/lib/repo';
import { getSettings, getTheme } from '@/lib/queries';
import { stripCircles } from '@/lib/circles';

export const dynamic = 'force-dynamic';
/** Cartolina dell'articolo: la frase scelta dal lettore su un'immagine quadrata da mandare a una persona. La frase deve esistere davvero nel testo. */
export async function GET(req: Request) {
  const u = new URL(req.url); const a = await findArticle(u.searchParams.get('a') ?? ''); const quote = (u.searchParams.get('t') ?? '').replace(/\s+/g, ' ').trim().slice(0, 240);
  if (!a || a.status !== 'published' || a.extra?.circle || quote.length < 12) return new Response('Not found', { status: 404 });
  const plain = stripCircles(a.content).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '); if (!plain.toLowerCase().includes(quote.slice(0, 40).toLowerCase())) return new Response('La frase non è in questo articolo', { status: 400 });
  const [s, theme] = await Promise.all([getSettings(), getTheme()]);
  return new ImageResponse((
    <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fbf7ee', color: '#1a1a1a', padding: 90, fontFamily: 'Georgia, serif' }}>
      <div style={{ fontSize: 120, lineHeight: 0.6, color: theme.accent, display: 'flex' }}>“</div>
      <div style={{ fontSize: quote.length > 160 ? 46 : quote.length > 90 ? 56 : 68, lineHeight: 1.25, display: 'flex' }}>{quote}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '3px solid #1a1a1a', paddingTop: 26 }}><div style={{ fontSize: 30, fontFamily: 'Arial, sans-serif', display: 'flex' }}>{a.title.length > 90 ? a.title.slice(0, 88) + '…' : a.title}</div><div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Arial, sans-serif', color: theme.accent, display: 'flex' }}>{s.siteName}</div></div>
    </div>
  ), { width: 1080, height: 1080, headers: { 'Cache-Control': 'public, max-age=86400', 'X-Robots-Tag': 'noindex' } });
}
