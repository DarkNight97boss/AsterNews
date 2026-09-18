import { NextResponse } from 'next/server';
import { insertVital } from '@/lib/repo-extra3';
import { checkLimit, ipKey } from '@/lib/ratelimit';
export const dynamic = 'force-dynamic';
/** Core Web Vitals reali dei lettori (LCP, CLS, INP, TTFB) senza cookie né identificativi. */
export async function POST(req: Request) {
  if (!checkLimit(await ipKey('vitals'), 30, 60_000).ok) return NextResponse.json({ ok: false }, { status: 429 });
  try { const b = await req.json() as { metrics?: { name: string; value: number }[]; path?: string; device?: string }; const path = (b.path ?? '/').split('?')[0].slice(0, 200); if (path.startsWith('/admin')) return NextResponse.json({ ok: false }); for (const m of (b.metrics ?? []).slice(0, 6)) { if (['LCP', 'CLS', 'INP', 'TTFB', 'FCP'].includes(m.name) && Number.isFinite(m.value)) await insertVital(path, m.name, Number(m.value), b.device === 'mobile' ? 'mobile' : 'desktop'); } return NextResponse.json({ ok: true }); } catch { return NextResponse.json({ ok: false }); }
}
