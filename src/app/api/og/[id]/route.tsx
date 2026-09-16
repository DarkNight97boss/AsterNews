import { ImageResponse } from 'next/og';
import { findArticle } from '@/lib/repo';
import { getCategories, getSettings, getTheme } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** Card social generata automaticamente (1200×630): titolo, occhiello, testata e copertina. Usata come og:image quando manca la foto o su richiesta. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, s, cats, theme] = await Promise.all([findArticle(id.replace(/\.png$/, '')), getSettings(), getCategories(), getTheme()]);
  if (!a || a.status !== 'published') return new Response('Not found', { status: 404 });
  const cat = cats.find((c) => c.id === a.categoryId);
  const kicker = (a.kicker || cat?.name || '').toUpperCase();
  const title = a.title.length > 110 ? a.title.slice(0, 107) + '…' : a.title;
  const withImage = !!a.coverImage && /^https?:\/\//.test(a.coverImage);
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', background: '#111', color: '#fff', fontFamily: 'Georgia, serif', position: 'relative' }}>
        {withImage && <img src={a.coverImage} alt="" width={1200} height={630} style={{ position: 'absolute', inset: 0, width: 1200, height: 630, objectFit: 'cover', opacity: 0.55 }} />}
        <div style={{ position: 'absolute', inset: 0, background: withImage ? 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 70%)' : theme.brand, display: 'flex' }} />
        <div style={{ position: 'absolute', top: 44, left: 60, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 14, height: 44, background: theme.accent, display: 'flex' }} />
          <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, fontFamily: 'Arial, sans-serif', display: 'flex' }}>{s.siteName}</div>
        </div>
        <div style={{ position: 'absolute', left: 60, right: 60, bottom: 60, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {kicker && <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 3, color: theme.accent, fontFamily: 'Arial, sans-serif', display: 'flex' }}>{kicker}</div>}
          <div style={{ fontSize: title.length > 70 ? 50 : 62, fontWeight: 800, lineHeight: 1.08, display: 'flex', textShadow: '0 2px 12px rgba(0,0,0,.5)' }}>{title}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } },
  );
}
