import { NextResponse } from 'next/server';
import { handleCallback, type Provider } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params; const u = new URL(req.url);
  const code = u.searchParams.get('code') ?? ''; const state = u.searchParams.get('state') ?? '';
  if (!code) return NextResponse.redirect(new URL('/account?errore=annullato', req.url));
  try { const back = await handleCallback(provider as Provider, code, state); return NextResponse.redirect(new URL(back, req.url)); }
  catch (e) { console.error('[oauth]', e); return NextResponse.redirect(new URL(`/account?errore=${encodeURIComponent((e as Error).message)}`, req.url)); }
}
