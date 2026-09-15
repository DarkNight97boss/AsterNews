import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { restoreBackup } from '@/lib/backup';
import { insertActivity } from '@/lib/repo';
import { uid } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Ripristino da file di backup (JSON o JSON compresso), corpo grezzo. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, 'settings.manage')) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) return NextResponse.json({ error: 'File vuoto' }, { status: 400 });
    const r = await restoreBackup(buf);
    await insertActivity({ id: uid('ac'), userId: me.id, action: 'ha ripristinato un backup:', target: `${r.rows} righe`, createdAt: new Date().toISOString() });
    return NextResponse.json(r);
  } catch (e) { console.error('[backup/restore]', e); return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }
}
