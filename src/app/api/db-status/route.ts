import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { all, isRemote, isServerless } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Diagnostica del database (solo amministratori): latenza, connessioni attive, lock in attesa, righe per tabella. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  const t0 = Date.now();
  await all('SELECT 1');
  const latencyMs = Date.now() - t0;
  const q = async (sql: string) => { try { return await all(sql); } catch (e) { return [{ errore: (e as Error).message }]; } };
  const [activity, locks, counts] = await Promise.all([
    q("SELECT pid, state, wait_event_type, wait_event, now() - xact_start AS in_transazione_da, now() - query_start AS query_da, left(query, 160) AS query FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state <> 'idle' ORDER BY xact_start NULLS LAST"),
    q('SELECT l.pid, l.locktype, l.relation::regclass::text AS relazione, l.mode, l.granted, left(a.query, 120) AS query FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid WHERE NOT l.granted ORDER BY l.pid'),
    q("SELECT (SELECT count(*) FROM articles) AS articoli, (SELECT count(*) FROM categories) AS categorie, (SELECT count(*) FROM users) AS utenti, (SELECT count(*) FROM meta WHERE key = 'seeded') AS seed_completato"),
  ]);
  return NextResponse.json({ remoto: isRemote(), serverless: isServerless(), regione: process.env.VERCEL_REGION ?? null, latenzaMs: latencyMs, conteggi: counts[0], connessioniAttive: activity, lockInAttesa: locks });
}
