import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Blocca l'area redazione se manca il cookie di sessione (la verifica firmata avviene nel layout). */
export function proxy(request: NextRequest) {
  if (!request.cookies.get('aster_session')?.value) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
