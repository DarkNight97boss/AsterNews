/** Archivio e memoria: funzioni pure (giornale di un giorno, accadde oggi, indici, linee del tempo, seguiti, deposito legale). */
export interface ArcArticle { id: string; title: string; categoryId: string; tagIds: string[]; publishedAt: string | null; views: number; featured?: boolean }

/** Prima pagina ricostruita di un giorno: l'apertura è il pezzo in evidenza più letto, il resto raggruppato per sezione. */
export function frontPage<T extends ArcArticle>(list: T[]): { lead: T | null; sections: { categoryId: string; items: T[] }[] } {
  if (!list.length) return { lead: null, sections: [] };
  const sorted = [...list].sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || b.views - a.views); const lead = sorted[0];
  const by = new Map<string, T[]>(); for (const a of sorted.slice(1)) by.set(a.categoryId, [...(by.get(a.categoryId) ?? []), a]);
  return { lead, sections: [...by.entries()].map(([categoryId, items]) => ({ categoryId, items })).sort((a, b) => b.items.length - a.items.length) };
}
/** Accadde oggi: stesso giorno e mese di anni precedenti, dal più lontano. */
export function sameDay<T extends { publishedAt: string | null }>(list: T[], mmdd: string, todayYear: number): { year: number; items: T[] }[] {
  const by = new Map<number, T[]>();
  for (const a of list) { if (!a.publishedAt || a.publishedAt.slice(5, 10) !== mmdd) continue; const y = Number(a.publishedAt.slice(0, 4)); if (y >= todayYear) continue; by.set(y, [...(by.get(y) ?? []), a]); }
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([year, items]) => ({ year, items }));
}
/** Indice alfabetico (toponimi, persone): lettera → voci; articoli e preposizioni iniziali ignorati («Via Roma» sotto R). */
export function alphaIndex<T extends { title: string }>(items: T[]): { letter: string; items: T[] }[] {
  const key = (t: string) => { const w = t.replace(/^(via|viale|piazza|piazzale|corso|largo|vicolo|strada|lungomare|lungofiume|salita|calle|campo|ponte|borgo|contrada|rione|quartiere)\s+(d[aei]l?l?[aeio']?\s+|dei\s+|degli\s+|delle\s+)?/i, '').trim(); const c = (w[0] ?? '#').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return /[A-Z]/.test(c) ? c : '#'; };
  const by = new Map<string, T[]>(); for (const it of items) { const k = key(it.title); by.set(k, [...(by.get(k) ?? []), it]); }
  return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([letter, list]) => ({ letter, items: list.sort((a, b) => a.title.localeCompare(b.title, 'it')) }));
}
/** Catalogo dei documenti: ricerca su titolo, ente, riassunto; filtro per ente; i più recenti prima. */
export function filterDocs<T extends { title: string; fields: Record<string, string> }>(docs: T[], q = '', ente = ''): T[] {
  const n = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); const words = n(q).split(/\s+/).filter((w) => w.length > 1);
  return docs.filter((d) => (!ente || d.fields.ente === ente) && words.every((w) => n(`${d.title} ${d.fields.ente ?? ''} ${d.fields.riassunto ?? ''}`).includes(w))).sort((a, b) => (b.fields.data ?? '').localeCompare(a.fields.data ?? ''));
}
/** Linea del tempo: anni → mesi → articoli, dal più vecchio. */
export function timeline<T extends { publishedAt: string | null }>(list: T[]): { year: string; months: { month: string; items: T[] }[]; n: number }[] {
  const years = new Map<string, Map<string, T[]>>();
  for (const a of [...list].filter((a) => a.publishedAt).sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!))) { const y = a.publishedAt!.slice(0, 4), m = a.publishedAt!.slice(0, 7); const ym = years.get(y) ?? new Map<string, T[]>(); ym.set(m, [...(ym.get(m) ?? []), a]); years.set(y, ym); }
  return [...years.entries()].map(([year, ms]) => { const months = [...ms.entries()].map(([month, items]) => ({ month, items })); return { year, months, n: months.reduce((s, m) => s + m.items.length, 0) }; });
}
/** Ruoli di una figura pubblica: «2019-2024: assessore ai lavori pubblici», «dal 2024: sindaco», «2016: candidato». */
export function parseRoles(text: string): { from: number; to: number | null; role: string }[] {
  const out: { from: number; to: number | null; role: string }[] = [];
  for (const line of text.split('\n')) { const m = line.match(/^\s*(?:dal\s+)?(\d{4})\s*(?:[-–—]\s*(\d{4}|oggi|in corso)?)?\s*:\s*(.+)$/i); if (!m) continue; const from = Number(m[1]); const to = m[2] ? (/^\d{4}$/.test(m[2]) ? Number(m[2]) : null) : /^\s*dal/i.test(line) ? null : from; out.push({ from, to, role: m[3].trim() }); }
  return out.sort((a, b) => a.from - b.from);
}
/** Chi era chi in un anno dato. */
export function rolesInYear<T extends { title: string; fields: Record<string, string> }>(figures: T[], year: number): { figure: T; role: string }[] {
  const out: { figure: T; role: string }[] = [];
  for (const f of figures) for (const r of parseRoles(f.fields.ruoli ?? '')) if (r.from <= year && (r.to === null || r.to >= year)) out.push({ figure: f, role: r.role });
  return out.sort((a, b) => a.role.localeCompare(b.role, 'it'));
}
/** Sfoglio delle annate: per ogni anno, i dodici mesi con il numero di articoli. */
export function yearGrid(months: { month: string; n: number }[]): { year: string; months: number[]; total: number }[] {
  const by = new Map<string, number[]>(); for (const m of months) { const y = m.month.slice(0, 4); const arr = by.get(y) ?? Array(12).fill(0); arr[Number(m.month.slice(5, 7)) - 1] += m.n; by.set(y, arr); }
  return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, ms]) => ({ year, months: ms, total: ms.reduce((s, n) => s + n, 0) }));
}
/** «Cosa è successo dopo»: articoli successivi (almeno `minDays` dopo) che condividono un argomento, i più condivisi e recenti prima. */
export function followUps<T extends ArcArticle>(a: ArcArticle, candidates: T[], minDays = 7, max = 5): T[] {
  if (!a.publishedAt || !a.tagIds.length) return []; const after = new Date(+new Date(a.publishedAt) + minDays * 86_400_000).toISOString(); const tags = new Set(a.tagIds);
  return candidates.filter((c) => c.id !== a.id && c.publishedAt && c.publishedAt >= after).map((c) => ({ c, shared: c.tagIds.filter((t) => tags.has(t)).length })).filter((x) => x.shared > 0).sort((x, y) => y.shared - x.shared || y.c.publishedAt!.localeCompare(x.c.publishedAt!)).slice(0, max).map((x) => x.c);
}
/** Storie senza seguito: pezzi letti, vecchi almeno `minAgeDays`, con argomenti, cui non è seguito nulla. */
export function withoutFollowUp<T extends ArcArticle>(list: T[], nowMs: number, minAgeDays = 180, limit = 30): T[] {
  const cutoff = new Date(nowMs - minAgeDays * 86_400_000).toISOString();
  return list.filter((a) => a.publishedAt && a.publishedAt < cutoff && a.tagIds.length && followUps(a, list, 7, 1).length === 0).sort((a, b) => b.views - a.views).slice(0, limit);
}
/** Deposito legale: impronta di un giorno concatenata alla precedente (chi altera un giorno rompe tutti i successivi). */
export async function depositHash(prev: string, body: string): Promise<string> { const { createHash } = await import('node:crypto'); return createHash('sha256').update(`${prev}\n${body}`).digest('hex'); }
export function chainOk(deposits: { date: string; hash: string; prev: string }[]): { ok: boolean; brokenAt: string | null } {
  const sorted = [...deposits].sort((a, b) => a.date.localeCompare(b.date)); let prev = '';
  for (const d of sorted) { if (d.prev !== prev) return { ok: false, brokenAt: d.date }; prev = d.hash; }
  return { ok: true, brokenAt: null };
}
/** Un giorno a caso tra quelli con articoli, pesato sul numero di pezzi. */
export function randomDay(days: { day: string; n: number }[], rnd = Math.random()): string | null { const total = days.reduce((s, d) => s + d.n, 0); if (!total) return null; let r = rnd * total; for (const d of days) { r -= d.n; if (r <= 0) return d.day; } return days[days.length - 1].day; }
