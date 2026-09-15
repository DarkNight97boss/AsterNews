import { NextResponse } from 'next/server';
import { recordHit } from '@/lib/repo-extra';
import { getSettings } from '@/lib/queries';
import { DEFAULT_ANALYTICS } from '@/lib/models';

export const dynamic = 'force-dynamic';

/** Classifica la sorgente del traffico dal referrer (nessun cookie, nessun identificativo personale). */
function sourceOf(ref: string, url: string): string {
  try {
    const u = new URL(url, 'http://x'); const utm = u.searchParams.get('utm_source');
    if (utm) return utm.toLowerCase().slice(0, 30);
    if (!ref) return 'diretto';
    const h = new URL(ref).hostname.replace(/^www\./, '');
    if (/google\./.test(h)) return 'google'; if (/bing\.com|duckduckgo|yahoo\./.test(h)) return 'altri motori';
    if (/facebook\.com|fb\.com|instagram\.com/.test(h)) return 'meta'; if (/t\.co$|twitter\.com|x\.com/.test(h)) return 'x'; if (/whatsapp|wa\.me/.test(h)) return 'whatsapp'; if (/telegram|t\.me/.test(h)) return 'telegram'; if (/linkedin/.test(h)) return 'linkedin';
    if (/news\.google/.test(h)) return 'google news'; if (/flipboard|feedly/.test(h)) return 'aggregatori';
    return h.slice(0, 40) || 'altro';
  } catch { return 'altro'; }
}
export async function POST(req: Request) {
  try {
    const a = { ...DEFAULT_ANALYTICS, ...((await getSettings()).analytics ?? {}) };
    if (!a.enabled) return NextResponse.json({ ok: false });
    const b = await req.json().catch(() => ({})) as { path?: string; articleId?: string; ref?: string; readMs?: number; internal?: boolean };
    const path = (b.path ?? '/').split('?')[0].slice(0, 300);
    if (path.startsWith('/admin') || path.startsWith('/api')) return NextResponse.json({ ok: false });
    const ref = b.ref ?? req.headers.get('referer') ?? '';
    const source = b.internal ? 'interno' : sourceOf(ref, b.path ?? '/');
    await recordHit(path, b.articleId ?? '', source, Math.max(0, Number(b.readMs) || 0));
    return NextResponse.json({ ok: true });
  } catch (e) { console.error('[hit]', e); return NextResponse.json({ ok: false }); }
}
