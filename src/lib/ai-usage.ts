import 'server-only';
import { all, get, run } from './db';

/** Registro dell'uso dell'assistente AI: una riga per richiesta, con costo stimato dai prezzi impostati. */
export interface AiUsageRow { id: string; userId: string; action: string; model: string; input: number; output: number; cost: number; createdAt: string }
const monthStart = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
export async function recordAiUsage(u: { userId: string; action: string; model: string; input: number; output: number; priceIn: number; priceOut: number }): Promise<void> {
  const cost = (u.input * u.priceIn + u.output * u.priceOut) / 1_000_000;
  await run('INSERT INTO ai_usage (id, user_id, action, model, input_tokens, output_tokens, cost, created_at) VALUES (?,?,?,?,?,?,?,?)', ['ai' + Math.random().toString(36).slice(2, 12), u.userId, u.action.slice(0, 60), u.model, u.input, u.output, cost, new Date().toISOString()]);
}
export async function monthCost(): Promise<number> { return Number(((await get('SELECT COALESCE(SUM(cost), 0) c FROM ai_usage WHERE created_at >= ?', [monthStart()])) as { c: number }).c); }
export async function aiUsageSummary(): Promise<{ month: { calls: number; input: number; output: number; cost: number }; byAction: { action: string; calls: number; cost: number }[]; byUser: { userId: string; calls: number; cost: number }[]; recent: AiUsageRow[] }> {
  const since = monthStart(); const num = (v: unknown) => Number(v ?? 0);
  const m = (await get('SELECT COUNT(*) calls, COALESCE(SUM(input_tokens),0) i, COALESCE(SUM(output_tokens),0) o, COALESCE(SUM(cost),0) c FROM ai_usage WHERE created_at >= ?', [since])) as Record<string, unknown>;
  const byAction = ((await all('SELECT action, COUNT(*) calls, COALESCE(SUM(cost),0) c FROM ai_usage WHERE created_at >= ? GROUP BY action ORDER BY calls DESC LIMIT 20', [since])) as Record<string, unknown>[]).map((r) => ({ action: String(r.action), calls: num(r.calls), cost: num(r.c) }));
  const byUser = ((await all('SELECT user_id, COUNT(*) calls, COALESCE(SUM(cost),0) c FROM ai_usage WHERE created_at >= ? GROUP BY user_id ORDER BY calls DESC LIMIT 20', [since])) as Record<string, unknown>[]).map((r) => ({ userId: String(r.user_id ?? ''), calls: num(r.calls), cost: num(r.c) }));
  const recent = ((await all('SELECT * FROM ai_usage ORDER BY created_at DESC LIMIT 40')) as Record<string, unknown>[]).map((r) => ({ id: String(r.id), userId: String(r.user_id ?? ''), action: String(r.action ?? ''), model: String(r.model ?? ''), input: num(r.input_tokens), output: num(r.output_tokens), cost: num(r.cost), createdAt: String(r.created_at ?? '') }));
  return { month: { calls: num(m.calls), input: num(m.i), output: num(m.o), cost: num(m.c) }, byAction, byUser, recent };
}
