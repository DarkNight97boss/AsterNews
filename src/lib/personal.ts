/** Blog personale e sito che cambia forma: un anno fa oggi, stagioni del tema, eredità, silenzio dichiarato, home che si compone dall'attività. Solo funzioni pure. */
export function onThisDay<T extends { publishedAt: string | null }>(arts: T[], today: string): (T & { yearsAgo: number })[] {
  const md = today.slice(5, 10), y = Number(today.slice(0, 4)); return arts.filter((a) => a.publishedAt && a.publishedAt.slice(5, 10) === md && Number(a.publishedAt.slice(0, 4)) < y).map((a) => ({ ...a, yearsAgo: y - Number(a.publishedAt!.slice(0, 4)) })).sort((a, b) => a.yearsAgo - b.yearsAgo);
}
export interface Season { id: string; name: string; from: string; to: string; accent?: string; brand?: string; banner?: string; mourning?: boolean }
/** Stagione attiva: date MM-GG (ricorrenti, anche a cavallo d'anno) oppure AAAA-MM-GG (una volta sola). */
export function activeSeason(seasons: Season[] | undefined, todayIso: string): Season | null {
  const day = todayIso.slice(0, 10), md = day.slice(5);
  for (const s of seasons ?? []) { if (!s.from || !s.to) continue; if (s.from.length === 10) { if (day >= s.from && day <= s.to) return s; continue; } const inRange = s.from <= s.to ? md >= s.from && md <= s.to : md >= s.from || md <= s.to; if (inRange) return s; }
  return null;
}
export interface LegacySettings { enabled: boolean; days: number; action: 'freeze' | 'handover' | 'archive'; heirName: string; heirEmail: string; message: string; triggeredAt?: string }
/** Testamento digitale: scatta quando nessuno della redazione accede da `days` giorni. Un mese prima parte un avviso al proprietario. */
export function legacyState(l: LegacySettings | undefined, lastLoginIso: string | null, nowMs: number): 'off' | 'ok' | 'warning' | 'due' | 'triggered' {
  if (!l?.enabled) return 'off'; if (l.triggeredAt) return 'triggered'; if (!lastLoginIso) return 'ok'; const idle = (nowMs - +new Date(lastLoginIso)) / 86_400_000; return idle >= l.days ? 'due' : idle >= l.days - 30 ? 'warning' : 'ok';
}
export function countdown(untilIso: string, nowMs: number): { days: number; over: boolean } { const d = Math.ceil((+new Date(untilIso) - nowMs) / 86_400_000); return { days: Math.max(0, d), over: d <= 0 }; }
/** Home che si compone dall'attività: guarda cosa hai pubblicato di recente e sceglie la disposizione. */
export function homeFromActivity(recent: { format: string; words: number }[]): 'grid' | 'magazine' | null {
  if (recent.length < 4) return null; const visual = recent.filter((a) => a.format === 'gallery' || a.format === 'video').length / recent.length; if (visual >= 0.6) return 'grid';
  const long = recent.filter((a) => a.words >= 1200).length / recent.length; return long >= 0.6 ? 'magazine' : null;
}
/** Messaggio al bot per la pagina «adesso»: «leggo: X», «scrivo: Y», «ascolto: Z», altrimenti è una nota libera. */
export function parseNow(text: string, prev: Record<string, string> = {}): Record<string, string> {
  const out = { ...prev }; const map: Record<string, string> = { leggo: 'reading', scrivo: 'writing', ascolto: 'listening', guardo: 'watching', sono: 'place' }; let matched = false;
  for (const part of text.split(/\n|;/)) { const m = part.trim().match(/^(leggo|scrivo|ascolto|guardo|sono)\s*:?\s+(.+)$/i); if (m) { out[map[m[1].toLowerCase()]] = m[2].trim().slice(0, 200); matched = true; } }
  if (!matched && text.trim()) out.note = text.trim().slice(0, 400); return out;
}
