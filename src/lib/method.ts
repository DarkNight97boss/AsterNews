/** Redazione e metodo: lessico, persone citate, cancelli prima di pubblicare (check-list per genere, due fonti, rilettura incrociata). Solo funzioni pure. */
export interface LexiconRule { avoid: string; prefer: string; note: string }
/** Righe «da evitare => preferire | nota». */
export const parseLexicon = (text: string): LexiconRule[] => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [left, rest = ''] = l.split('=>'); const [prefer, note = ''] = rest.split('|'); return { avoid: left.trim(), prefer: prefer.trim(), note: note.trim() }; }).filter((r) => r.avoid);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function lexiconCheck(text: string, rules: LexiconRule[]): { avoid: string; prefer: string; note: string; count: number }[] { const plain = text.replace(/<[^>]+>/g, ' '); return rules.map((r) => ({ ...r, count: (plain.match(new RegExp(`(^|[^\\p{L}])${esc(r.avoid)}(?=$|[^\\p{L}])`, 'giu')) ?? []).length })).filter((r) => r.count > 0); }
/** Persone citate: i contatti della rubrica il cui nome compare nel testo. */
export function mentions<T extends { name: string }>(text: string, contacts: T[]): T[] { const plain = text.replace(/<[^>]+>/g, ' ').toLowerCase(); return contacts.filter((c) => c.name.trim().length >= 5 && plain.includes(c.name.trim().toLowerCase())); }
export interface MethodSettings { checklists?: Record<string, string>; lexicon?: string; twoSources?: boolean; crossReadKinds?: string[] }
export interface GateInput { kind?: string; checked: string[]; sources: number; authorId: string; reviewedBy?: string; publisherId: string; wasPublished: boolean }
/** Cosa manca per pubblicare, secondo le regole della casa. Vuoto = si può pubblicare. Un articolo già pubblicato non viene ribloccato. */
export function publishGate(m: MethodSettings | undefined, g: GateInput): string[] {
  if (!m || g.wasPublished) return []; const out: string[] = []; const kind = g.kind ?? 'default';
  const items = (m.checklists?.[kind] ?? m.checklists?.default ?? '').split('\n').map((x) => x.trim()).filter(Boolean); const missing = items.filter((i) => !g.checked.includes(i)); if (missing.length) out.push(`Check-list «${kind}» incompleta: ${missing.slice(0, 3).join('; ')}${missing.length > 3 ? '…' : ''}`);
  if (m.twoSources && (kind === 'cronaca' || kind === 'inchiesta') && g.sources < 2) out.push('Regola delle due fonti: servono almeno due fonti con nome nel pannello Fonti.');
  if ((m.crossReadKinds ?? []).includes(kind)) { if (!g.reviewedBy) out.push('Rilettura incrociata: un collega diverso dall\'autore deve segnare «Ho riletto».'); else if (g.reviewedBy === g.authorId || g.reviewedBy === g.publisherId) out.push('Rilettura incrociata: chi rilegge deve essere diverso da chi scrive e da chi pubblica.'); }
  return out;
}
