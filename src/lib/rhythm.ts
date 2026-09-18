/** Sostenibilità: CO₂ per pagina, orari di quiete, sovraccarico, costo reale di un articolo, prezzo libero sensato, metriche di senso, uscita pulita. Solo funzioni pure. */
/** Sustainable Web Design: 0,81 kWh per GB trasferito, 75% per una visita con cache, 442 g di CO₂ per kWh (media mondiale). */
export const co2Grams = (bytes: number): number => +((bytes / 1e9) * 0.81 * 0.75 * 442).toFixed(3);
export const co2Rating = (grams: number): 'A' | 'B' | 'C' | 'D' | 'E' => (grams <= 0.1 ? 'A' : grams <= 0.2 ? 'B' : grams <= 0.35 ? 'C' : grams <= 0.6 ? 'D' : 'E');
export const isNight = (hour: number): boolean => hour >= 23 || hour < 6;
/** Orari di quiete: «22:00»–«07:30», anche a cavallo della mezzanotte. */
export function inQuietHours(from: string | undefined, to: string | undefined, hhmm: string): boolean { if (!from || !to || from === to) return false; return from < to ? hhmm >= from && hhmm < to : hhmm >= from || hhmm < to; }
export interface LoadInput { userId: string; name: string; openDrafts: number; dueSoon: number; overdue: number; publishedWeek: number; handoffs: number }
export interface LoadResult extends LoadInput { score: number; level: 'ok' | 'pieno' | 'troppo'; reasons: string[] }
/** Rilevatore di sovraccarico: non misura la produttività, segnala quando a una persona è stato dato troppo. */
export function workload(list: LoadInput[], maxOpen = 6): LoadResult[] {
  return list.map((u) => { const reasons: string[] = []; if (u.openDrafts > maxOpen) reasons.push(`${u.openDrafts} pezzi aperti (oltre ${maxOpen})`); if (u.overdue > 0) reasons.push(`${u.overdue} scadenze già passate`); if (u.dueSoon >= 3) reasons.push(`${u.dueSoon} scadenze nei prossimi tre giorni`); if (u.publishedWeek >= 12) reasons.push(`${u.publishedWeek} articoli pubblicati in sette giorni`); if (u.handoffs >= 3) reasons.push(`${u.handoffs} pezzi ricevuti in staffetta`);
    const score = u.openDrafts + u.dueSoon * 2 + u.overdue * 3 + Math.max(0, u.publishedWeek - 6) + u.handoffs; return { ...u, score, reasons, level: (reasons.length >= 2 || u.overdue >= 3 ? 'troppo' : reasons.length === 1 ? 'pieno' : 'ok') as LoadResult['level'] }; }).sort((a, b) => b.score - a.score);
}
export interface CostInput { hours: number; expenses: number; views: number; subscriptions: number; sourceShare?: number }
/** Costo reale di un articolo: ore per tariffa più spese, contro i ricavi stimati (pubblicità per mille visite, abbonamenti nati dal pezzo). */
export function articleEconomics(c: CostInput, r: { hourlyRate: number; rpm: number; subscriptionValue: number }): { cost: number; revenue: number; margin: number; owedToSource: number; perReader: number | null } {
  const cost = c.hours * r.hourlyRate + c.expenses; const subRevenue = c.subscriptions * r.subscriptionValue; const revenue = (c.views / 1000) * r.rpm + subRevenue; const owed = subRevenue * Math.min(50, Math.max(0, c.sourceShare ?? 0)) / 100; const round = (n: number) => Math.round(n * 100) / 100;
  return { cost: round(cost), revenue: round(revenue), margin: round(revenue - cost - owed), owedToSource: round(owed), perReader: c.views > 0 ? round(cost / c.views) : null };
}
/** Prezzo libero sensato: parte da quanto leggi (minuti al mese), resta tra un minimo dignitoso e il prezzo pieno, arrotondato al mezzo euro. */
export function fairPrice(minutesPerMonth: number, full: number, floor = 1): { suggested: number; label: string } {
  const ratio = Math.min(1, minutesPerMonth / 240); const raw = floor + (full - floor) * Math.sqrt(ratio); const suggested = Math.max(floor, Math.min(full, Math.round(raw * 2) / 2));
  return { suggested, label: minutesPerMonth < 20 ? 'leggi poco: va bene una cifra simbolica' : minutesPerMonth < 90 ? 'leggi ogni tanto' : minutesPerMonth < 240 ? 'leggi spesso' : 'ci leggi tutti i giorni' };
}
export interface MeaningInput { id: string; title: string; views: number; ends: number; saves: number; thanks: number; highlights: number; mindChanged: number; mindTotal: number; responses: number }
/** Metriche di senso: non quanti hanno cliccato, ma cosa ha lasciato. Ogni voce vale per ciò che costa al lettore farla. */
export function meaningScore(m: MeaningInput): { score: number; endRate: number | null; mindRate: number | null } {
  const endRate = m.views >= 20 ? Math.min(1, m.ends / m.views) : null; const mindRate = m.mindTotal >= 5 ? m.mindChanged / m.mindTotal : null;
  return { score: Math.round((endRate ?? 0) * 40 + Math.min(20, m.saves * 2) + Math.min(15, m.thanks * 3) + Math.min(10, m.highlights) + (mindRate ?? 0) * 10 + Math.min(15, m.responses * 5)), endRate, mindRate };
}
/** Uscita pulita: la mappa dei redirect nei formati che gli altri sistemi capiscono. */
export function redirectMap(paths: { from: string; to: string }[], format: 'csv' | 'netlify' | 'nginx' | 'apache' | 'wordpress'): string {
  const rows = paths.filter((p) => p.from && p.to && p.from !== p.to);
  if (format === 'netlify') return rows.map((p) => `${p.from}  ${p.to}  301`).join('\n') + '\n'; if (format === 'nginx') return rows.map((p) => `rewrite ^${p.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$ ${p.to} permanent;`).join('\n') + '\n';
  if (format === 'apache') return rows.map((p) => `Redirect 301 ${p.from} ${p.to}`).join('\n') + '\n'; if (format === 'wordpress') return 'source,target,regex,code\n' + rows.map((p) => `${p.from},${p.to},0,301`).join('\n') + '\n';
  return 'da,a\n' + rows.map((p) => `${p.from},${p.to}`).join('\n') + '\n';
}
