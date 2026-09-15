import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canEdit } from '@/lib/permissions';
import { findArticle } from '@/lib/repo';
import { findAutosave } from '@/lib/repo-extra';

export const dynamic = 'force-dynamic';

/** Bozza salvata automaticamente per un articolo (solo per chi può modificarlo). */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id') ?? '';
  const a = await findArticle(id);
  if (!a || !canEdit(me, a)) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
  const d = await findAutosave(id);
  if (!d) return NextResponse.json(null);
  return NextResponse.json({ data: d.data, updatedAt: d.updatedAt, userId: d.userId });
}
