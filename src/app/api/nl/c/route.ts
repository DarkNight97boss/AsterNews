import { NextResponse } from 'next/server';
import { recordNewsletterEvent } from '@/lib/repo-extra2';
import { siteUrl } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
/** Redirect con tracciamento dei clic nella newsletter. */
export async function GET(req: Request) {
  const u = new URL(req.url); const s = u.searchParams.get('s') ?? ''; const r = u.searchParams.get('r') ?? ''; const target = u.searchParams.get('u') ?? '/';
  const safe = /^https?:\/\//.test(target) ? target : siteUrl() + (target.startsWith('/') ? target : '/' + target);
  if (s && r && s !== 'test') recordNewsletterEvent(s, r, 'click', safe.split('?')[0]).catch(() => {});
  return NextResponse.redirect(safe, 302);
}
