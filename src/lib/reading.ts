/** Lettura: codice di tre parole, lettura a tempo, evidenziazioni collettive, «ho cambiato idea», schede dall'archivio, mappa del territorio. Solo funzioni pure. */
const WORDS = 'mare sole luna vento fiume monte prato bosco pietra sabbia neve pioggia nuvola stella alba sera notte isola porto ponte strada piazza torre campo orto vigna ulivo pino rosa viola giglio menta salvia pane sale miele latte uva pera mela noce fico grano riso lago onda scoglio faro barca vela remo nido volpe lupo orso gatto cane merlo gufo rondine ape grillo lepre cervo trota tonno polpo riccio carta penna libro lampada sedia tavolo finestra porta chiave campana treno bici ruota sasso ferro legno vetro seta lana filo ago tazza piatto forno brace fumo cenere'.split(' ');
export const codeFromBytes = (bytes: number[]): string => bytes.slice(0, 3).map((b) => WORDS[b % WORDS.length]).join('-');
export const normalizeCode = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter(Boolean).slice(0, 3).join('-');
/** Lettura a tempo: quanti paragrafi stanno nel tempo dichiarato (200 parole al minuto), tenendo sempre almeno il primo. */
export function paragraphsForMinutes(paragraphWords: number[], minutes: number, wpm = 200): number { let budget = minutes * wpm; let n = 0; for (const w of paragraphWords) { if (n > 0 && budget - w < 0) break; budget -= w; n++; } return Math.max(1, n); }
export function depthForMinutes(minutesByDepth: number[], minutes: number): 1 | 2 | 3 { let best = 1; minutesByDepth.forEach((m, i) => { if (m <= minutes) best = i + 1; }); return best as 1 | 2 | 3; }
/** Evidenziazioni collettive: i passaggi sottolineati da almeno `min` lettori, con un'intensità da 1 a 3. */
export function topHighlights(texts: string[], min = 2, max = 12): { text: string; count: number; weight: 1 | 2 | 3 }[] {
  const m = new Map<string, { text: string; count: number }>(); for (const t of texts) { const k = t.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 80); if (k.length < 12) continue; const cur = m.get(k); if (cur) cur.count++; else m.set(k, { text: t.trim(), count: 1 }); }
  const list = [...m.values()].filter((x) => x.count >= min).sort((a, b) => b.count - a.count).slice(0, max); const top = list[0]?.count ?? 1;
  return list.map((x) => ({ ...x, weight: (x.count >= top * 0.75 ? 3 : x.count >= top * 0.4 ? 2 : 1) as 1 | 2 | 3 }));
}
export type Stance = 'si' | 'forse' | 'no';
export function mindShift(rows: { before: Stance; after: Stance }[]): { total: number; changed: number; percent: number; before: Record<Stance, number>; after: Record<Stance, number> } | null {
  if (!rows.length) return null; const z = (): Record<Stance, number> => ({ si: 0, forse: 0, no: 0 }); const before = z(), after = z(); let changed = 0;
  for (const r of rows) { if (!(r.before in before) || !(r.after in after)) continue; before[r.before]++; after[r.after]++; if (r.before !== r.after) changed++; }
  return { total: rows.length, changed, percent: Math.round((changed / rows.length) * 100), before, after };
}
export interface EntityCard { count: number; first: string | null; last: string | null; perYear: { year: string; n: number }[]; coTags: { id: string; n: number }[]; zones: { id: string; n: number }[] }
/** «Ciò che sa il giornale su…»: dall'elenco degli articoli che citano un luogo, una persona o un ente. */
export function entityCard(arts: { publishedAt: string | null; tagIds: string[]; zoneId: string }[], selfTagId = ''): EntityCard {
  const dated = arts.filter((a) => a.publishedAt).sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!)); const count = (keys: string[]) => Object.entries(keys.reduce<Record<string, number>>((m, k) => { if (k) m[k] = (m[k] ?? 0) + 1; return m; }, {})).map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n);
  return { count: arts.length, first: dated[0]?.publishedAt ?? null, last: dated[dated.length - 1]?.publishedAt ?? null, perYear: count(dated.map((a) => a.publishedAt!.slice(0, 4))).map((x) => ({ year: x.id, n: x.n })).sort((a, b) => a.year.localeCompare(b.year)), coTags: count(arts.flatMap((a) => a.tagIds.filter((t) => t !== selfTagId))).filter((x) => x.n >= 2).slice(0, 8), zones: count(arts.map((a) => a.zoneId)).slice(0, 4) };
}
export const placeSlug = (address: string): string => address.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(n\.?|numero|civico)\s*\d+\w*/g, '').replace(/\d+\w*(\/\w+)?/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
/** Mappa del sito come territorio: ogni sezione è una regione su un anello, gli articoli punti al suo interno; posizione stabile (dipende dall'id). */
export function territory<T extends { id: string; categoryId: string }>(arts: T[], catIds: string[], size = 1000): { regions: { id: string; x: number; y: number; r: number }[]; points: (T & { x: number; y: number })[] } {
  const used = catIds.filter((c) => arts.some((a) => a.categoryId === c)); const n = Math.max(1, used.length); const R = size * 0.34; const c = size / 2;
  const regions = used.map((id, i) => { const k = arts.filter((a) => a.categoryId === id).length; const ang = (i / n) * Math.PI * 2 - Math.PI / 2; return { id, x: Math.round(c + Math.cos(ang) * R), y: Math.round(c + Math.sin(ang) * R), r: Math.round(Math.min(size * 0.16, 40 + Math.sqrt(k) * 16)) }; });
  const h = (s: string, salt: number) => { let x = 2166136261 ^ salt; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return ((x >>> 0) % 10000) / 10000; };
  const points = arts.flatMap((a) => { const reg = regions.find((r) => r.id === a.categoryId); if (!reg) return []; const ang = h(a.id, 1) * Math.PI * 2; const d = Math.sqrt(h(a.id, 2)) * (reg.r - 8); return [{ ...a, x: Math.round(reg.x + Math.cos(ang) * d), y: Math.round(reg.y + Math.sin(ang) * d) }]; });
  return { regions, points };
}
