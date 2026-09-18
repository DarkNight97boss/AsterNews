import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * - Area redazione: blocca se manca il cookie di sessione (la verifica firmata avviene nel layout).
 * - Home: assegna una volta il gruppo del test A/B dei titoli (cookie `ab`, 50/50, 30 giorni). Non è un dato personale: vale solo «a» o «b».
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!request.cookies.get('aster_session')?.value) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (request.cookies.get('ab')?.value) return NextResponse.next();
  const bucket = Math.random() < 0.5 ? 'a' : 'b';
  // Il cookie va anche nella richiesta in corso, così la prima visita vede già la sua variante.
  request.cookies.set('ab', bucket);
  const res = NextResponse.next({ request: { headers: request.headers } });
  res.cookies.set('ab', bucket, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/'],
};
