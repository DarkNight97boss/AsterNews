import { NextResponse } from 'next/server';
import { suggest } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/** Suggerimenti di ricerca mentre si digita (tag e titoli). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';
  const items = await suggest(q.slice(0, 60)).catch(() => []);
  return NextResponse.json(items, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
