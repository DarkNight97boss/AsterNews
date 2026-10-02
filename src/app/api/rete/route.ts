import { NextResponse } from 'next/server';
import { networkFeed } from '@/lib/platform-data';

export const dynamic = 'force-dynamic';
/** La rete delle testate: cosa pubblichiamo (titoli e link) e cosa offriamo da ripubblicare (con il testo e la licenza). */
export async function GET() { return NextResponse.json(await networkFeed(), { headers: { 'Cache-Control': 'public, max-age=600', 'Access-Control-Allow-Origin': '*' } }); }
