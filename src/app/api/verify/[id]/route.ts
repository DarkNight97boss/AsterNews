import { NextResponse } from 'next/server';
import { findArticle } from '@/lib/repo';
import { publicKeyPem, verifyArticle } from '@/lib/signing';

/** Verifica pubblica della firma: impronta del testo attuale, firma, chiave pubblica. Con ?hash= si controlla una copia trovata altrove. */
export async function GET(req: Request, ctx: RouteContext<'/api/verify/[id]'>) {
  const { id } = await ctx.params; const a = await findArticle(id); if (!a || a.status !== 'published' || a.extra?.circle) return NextResponse.json({ error: 'Articolo non trovato' }, { status: 404 });
  const v = await verifyArticle(a.title, a.content, a.extra?.signature); const given = new URL(req.url).searchParams.get('hash');
  return NextResponse.json({ id: a.id, title: a.title, signed: v.signed, authentic: v.authentic, intact: v.intact, hash: a.extra?.signature?.hash ?? null, signature: a.extra?.signature?.sig ?? null, signedAt: a.extra?.signature?.at ?? null, algorithm: 'Ed25519 su SHA-256 del testo canonico (titolo + corpo senza markup)', publicKey: await publicKeyPem(), ...(given ? { matchesGivenHash: given === a.extra?.signature?.hash } : {}) }, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
