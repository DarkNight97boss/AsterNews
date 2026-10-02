import { depositBundle } from '@/lib/archive-data';
import { findRecord } from '@/lib/records';
import type { Deposit } from '@/lib/archive-data';

/** Fascicolo di un giorno, rigenerato dal database; l'intestazione porta l'impronta registrata, per il confronto. */
export async function GET(_req: Request, ctx: RouteContext<'/api/export/deposito/[date]'>) {
  const { date } = await ctx.params; if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response('Data non valida', { status: 400 });
  const [{ json }, rec] = await Promise.all([depositBundle(date), findRecord<Deposit>(`dep_${date}`)]);
  return new Response(json, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="deposito-${date}.json"`, ...(rec ? { 'X-Deposit-Hash': rec.data.hash, 'X-Deposit-Prev': rec.data.prev } : {}) } });
}
