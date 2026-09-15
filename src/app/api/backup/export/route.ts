import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { exportChunks, lastDbBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Esportazione completa del database in JSON (streaming) oppure l'ultimo backup compresso salvato nel database (?last=1). */
export async function GET(req: Request) {
  const me = await getCurrentUser();
  if (!me || !can(me, 'settings.manage')) return new Response('Non autorizzato', { status: 401 });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  if (new URL(req.url).searchParams.get('last') === '1') {
    const gz = await lastDbBackup();
    if (!gz) return new Response('Nessun backup nel database', { status: 404 });
    return new Response(new Uint8Array(gz), { headers: { 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="aster-backup-${stamp}.json.gz"` } });
  }
  const enc = new TextEncoder();
  const gen = exportChunks();
  const stream = new ReadableStream({ async pull(ctrl) { const { value, done } = await gen.next(); if (done) ctrl.close(); else ctrl.enqueue(enc.encode(value)); } });
  return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="aster-export-${stamp}.json"`, 'Cache-Control': 'no-store' } });
}
