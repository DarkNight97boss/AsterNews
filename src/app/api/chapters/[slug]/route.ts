import { NextResponse } from 'next/server';
import { findArticleBySlug } from '@/lib/repo';
export const dynamic = 'force-dynamic';
/** Capitoli del podcast (Podcast Namespace, application/json+chapters). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const a = await findArticleBySlug(slug); if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const toSec = (t: string) => t.split(':').reverse().reduce((acc, v, i) => acc + Number(v) * 60 ** i, 0);
  return NextResponse.json({ version: '1.2.0', title: a.title, chapters: (a.extra?.podcast?.chapters ?? []).map((c) => ({ startTime: toSec(c.time), title: c.title })) }, { headers: { 'Content-Type': 'application/json+chapters', 'Cache-Control': 'public, max-age=600' } });
}
