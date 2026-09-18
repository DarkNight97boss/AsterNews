import { NextResponse } from 'next/server';
import { authorizeUrl, availableProviders, staffProviders, type Provider } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

/** Avvio del login social: /api/auth/google?back=/percorso */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params; const p = provider as Provider;
  const staff = new URL(req.url).searchParams.get('staff') === '1';
  if (staff) { if (!(await staffProviders()).includes(p)) return NextResponse.redirect(new URL('/login?errore=sso', req.url)); return NextResponse.redirect(await authorizeUrl(p, new URL(req.url).searchParams.get('back') ?? '/admin', true)); }
  if (!(await availableProviders()).includes(p)) return NextResponse.redirect(new URL('/account?errore=provider', req.url));
  const back = new URL(req.url).searchParams.get('back') ?? '/account';
  return NextResponse.redirect(await authorizeUrl(p, back));
}
