/** Lettori e servizio: funzioni pure (guide con data di verifica, tempo di lettura personale, distintivi, sondaggio deliberativo, promemoria civici, diario). */
export function guideStatus(verifiedAt: string | undefined, everyDays: number, nowMs: number): { state: 'ok' | 'due' | 'stale' | 'never'; days: number } {
  if (!verifiedAt) return { state: 'never', days: 0 }; const days = Math.floor((nowMs - +new Date(verifiedAt)) / 86_400_000);
  return { state: days > everyDays * 1.5 ? 'stale' : days > everyDays ? 'due' : 'ok', days };
}
/** Parole al minuto misurate, con limiti sensati: sotto le 80 non è lettura, sopre le 700 è scorrimento. */
export function wpmFrom(words: number, seconds: number): number | null { if (words < 150 || seconds < 20) return null; const w = words / (seconds / 60); return w < 80 || w > 700 ? null : Math.round(w); }
export const smoothWpm = (old: number | null, next: number): number => Math.round(old ? old * 0.7 + next * 0.3 : next);
export const personalMinutes = (words: number, wpm: number): number => Math.max(1, Math.round(words / wpm));
/** Distintivo del lettore-corrispondente dai contributi approvati. */
export function badgeLevel(approved: number): { label: string; icon: string } | null { if (approved >= 10) return { label: 'Corrispondente di fiducia', icon: '🏅' }; if (approved >= 3) return { label: 'Lettore-corrispondente', icon: '📝' }; return null; }
/** Sondaggio deliberativo: voto prima e dopo aver letto le ragioni; quanti hanno cambiato idea. */
export function shiftStats(votes: { before?: string; after?: string }[]): { n: number; before: Record<string, number>; after: Record<string, number>; changed: number; completed: number } {
  const before: Record<string, number> = { si: 0, no: 0 }, after: Record<string, number> = { si: 0, no: 0 }; let changed = 0, completed = 0;
  for (const v of votes) { if (v.before) before[v.before] = (before[v.before] ?? 0) + 1; if (v.after) { after[v.after] = (after[v.after] ?? 0) + 1; if (v.before) { completed++; if (v.before !== v.after) changed++; } } }
  return { n: votes.filter((v) => v.before).length, before, after, changed, completed };
}
export interface Deadline { id: string; title: string; date: string; yearly: boolean; text: string; url: string }
/** Scadenza successiva (le annuali tornano ogni anno) e quelle in finestra di avviso. */
export function nextOccurrence(d: Deadline, today: string): string | null { if (!d.yearly) return d.date >= today ? d.date : null; const mmdd = d.date.slice(5, 10); const y = Number(today.slice(0, 4)); const thisYear = `${y}-${mmdd}`; return thisYear >= today ? thisYear : `${y + 1}-${mmdd}`; }
export function remindersDue(deadlines: Deadline[], today: string, daysBefore = 3): { deadline: Deadline; on: string; inDays: number }[] {
  const t = +new Date(`${today}T00:00:00Z`); const out: { deadline: Deadline; on: string; inDays: number }[] = [];
  for (const d of deadlines) { const on = nextOccurrence(d, today); if (!on) continue; const inDays = Math.round((+new Date(`${on}T00:00:00Z`) - t) / 86_400_000); if (inDays === daysBefore) out.push({ deadline: d, on, inDays }); }
  return out;
}
export function upcoming(deadlines: Deadline[], today: string, limit = 20): { deadline: Deadline; on: string; inDays: number }[] { const t = +new Date(`${today}T00:00:00Z`); return deadlines.map((d) => ({ d, on: nextOccurrence(d, today) })).filter((x): x is { d: Deadline; on: string } => !!x.on).map(({ d, on }) => ({ deadline: d, on, inDays: Math.round((+new Date(`${on}T00:00:00Z`) - t) / 86_400_000) })).sort((a, b) => a.inDays - b.inDays).slice(0, limit); }
/** Diario delle letture: per mese, con gli argomenti più letti. */
export function readingDiary(reads: { articleId: string; createdAt: string }[], articles: Map<string, { title: string; tagIds: string[]; categoryId: string }>): { months: { month: string; n: number; items: { articleId: string; title: string; at: string }[] }[]; topTags: { id: string; n: number }[]; total: number } {
  const months = new Map<string, { articleId: string; title: string; at: string }[]>(); const tags = new Map<string, number>(); let total = 0;
  for (const r of [...reads].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) { const a = articles.get(r.articleId); if (!a) continue; total++; const m = r.createdAt.slice(0, 7); months.set(m, [...(months.get(m) ?? []), { articleId: r.articleId, title: a.title, at: r.createdAt }]); for (const t of a.tagIds) tags.set(t, (tags.get(t) ?? 0) + 1); }
  return { months: [...months.entries()].map(([month, items]) => ({ month, n: items.length, items })), topTags: [...tags.entries()].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n).slice(0, 8), total };
}
