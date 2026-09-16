import 'server-only';
import * as repo from './repo';
import type { Article } from './models';

/** Test A/B dei titoli in home: variante scelta per visitatore (cookie), impressioni e clic contati, vincitore automatico. */
export const hasAb = (a: Article): boolean => !!a.extra?.titleB && !a.extra?.abStats?.winner;
export function pickVariant(a: Article, bucket: 'a' | 'b'): { title: string; variant: 'a' | 'b' | null } {
  if (!a.extra?.titleB) return { title: a.title, variant: null };
  if (a.extra.abStats?.winner) return { title: a.extra.abStats.winner === 'b' ? a.extra.titleB : a.title, variant: null };
  return { title: bucket === 'b' ? a.extra.titleB : a.title, variant: bucket };
}
export async function recordAb(id: string, variant: 'a' | 'b', kind: 'impression' | 'click'): Promise<void> {
  const a = await repo.findArticle(id); if (!a?.extra?.titleB || a.extra.abStats?.winner) return;
  const st = { a: 0, b: 0, ca: 0, cb: 0, ...(a.extra.abStats ?? {}) };
  if (kind === 'impression') st[variant] += 1; else if (variant === 'a') st.ca += 1; else st.cb += 1;
  let winner: 'a' | 'b' | undefined;
  if (st.a >= 200 && st.b >= 200) { const ra = st.ca / st.a, rb = st.cb / st.b; if (Math.abs(ra - rb) >= Math.max(ra, rb) * 0.15) winner = rb > ra ? 'b' : 'a'; else if (st.a + st.b >= 3000) winner = rb >= ra ? 'b' : 'a'; }
  const extra = { ...a.extra, abStats: { ...st, ...(winner ? { winner } : {}) } };
  await repo.patchArticle(id, { extra: JSON.stringify(extra) });
  if (winner === 'b') { await repo.upsertArticle({ ...a, title: a.extra.titleB, extra: { ...extra, titleB: a.title } }); }
}
