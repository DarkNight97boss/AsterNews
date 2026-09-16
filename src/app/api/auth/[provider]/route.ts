import { NextResponse } from 'next/server';
import { authorizeUrl, availableProviders, type Provider } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

/** Avvio del login social: /api/auth/google?back=/percorso */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params; const p = provider as Provider;
  if (!(await availableProviders()).includes(p)) return NextResponse.redirect(new URL('/account?errore=provider', req.url));
  const back = new URL(req.url).searchParams.get('back') ?? '/account';
  return NextResponse.redirect(await authorizeUrl(p, back));
}
