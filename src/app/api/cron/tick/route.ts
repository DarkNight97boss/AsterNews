import { NextResponse } from 'next/server';
import { runDailyJobs, runMinuteJobs } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Lavori pianificati. Chiamato dal cron di Vercel (intestazione Authorization: Bearer CRON_SECRET, aggiunta automaticamente)
 * oppure da un servizio esterno (cron-job.org, ecc.) con ?job=minute&secret=CRON_SECRET ogni minuto.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? '';
  const provided = url.searchParams.get('secret') ?? (auth.startsWith('Bearer ') ? auth.slice(7) : '');
  if (secret && provided !== secret) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  if (!secret && process.env.VERCEL && !req.headers.get('x-vercel-cron') && !auth) return NextResponse.json({ error: 'Imposta CRON_SECRET' }, { status: 401 });
  try {
    const report = url.searchParams.get('job') === 'daily' ? await runDailyJobs() : await runMinuteJobs();
    return NextResponse.json({ ok: true, ...report, at: new Date().toISOString() });
  } catch (e) { console.error('[cron]', e); return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 }); }
}
