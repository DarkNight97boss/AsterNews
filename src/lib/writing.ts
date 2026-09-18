/** Officina di scrittura: impronta di stile, appunti che maturano, serie di giorni, dati vivi, note d'autore, frasi con scadenza. Solo funzioni pure. */
const text = (html: string): string => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('il lo la i gli le un uno una di a da in con su per tra fra e ed o ma che non si è era sono del della dei delle degli al alla ai alle dal dalla nel nella sul sulla come più anche se ci ne mi ti lo li questo questa quello quella quando dove chi cui ha hanno ho essere fare fatto dopo prima molto poco già ancora solo tutto tutti sua suo loro nostro'.split(' '));
export interface StyleFingerprint { samples: number; words: number; sentenceLen: number; wordLen: number; commas: number; questions: number; longSentences: number; adverbs: number; firstPerson: number }
/** Misure semplici e stabili di come scrive una persona, per 100 frasi o 1000 parole: niente AI, solo conteggi. */
export function styleFingerprint(htmls: string[]): StyleFingerprint | null {
  const docs = htmls.map(text).filter((t) => t.split(' ').length >= 40); if (!docs.length) return null; const all = docs.join(' ');
  const sentences = all.split(/(?<=[.!?…])\s+/).filter((s) => s.split(' ').length >= 2); const words = all.toLowerCase().match(/[a-zàèéìòù']+/g) ?? []; if (!sentences.length || !words.length) return null;
  const per1000 = (n: number) => +((n / words.length) * 1000).toFixed(1);
  return { samples: docs.length, words: words.length, sentenceLen: +(words.length / sentences.length).toFixed(1), wordLen: +(words.reduce((n, w) => n + w.length, 0) / words.length).toFixed(2), commas: per1000((all.match(/,/g) ?? []).length), questions: +(((all.match(/\?/g) ?? []).length / sentences.length) * 100).toFixed(1), longSentences: +((sentences.filter((s) => s.split(' ').length > 30).length / sentences.length) * 100).toFixed(1), adverbs: per1000(words.filter((w) => w.length > 6 && w.endsWith('mente')).length), firstPerson: per1000(words.filter((w) => ['io', 'mi', 'mio', 'mia', 'miei', 'mie', 'noi', 'nostro', 'nostra'].includes(w)).length) };
}
export interface StyleDrift { score: number; notes: string[] }
/** Quanto un testo si allontana dall'impronta: 0 = è il tuo stile, 100 = non sembra tuo. Le note dicono dove. */
export function styleDrift(base: StyleFingerprint, html: string): StyleDrift | null {
  const cur = styleFingerprint([html]); if (!cur) return null; const notes: string[] = []; let sum = 0;
  const cmp = (k: keyof StyleFingerprint, label: string, unit: string, tol: number, floor: number) => { const b = base[k], c = cur[k]; const rel = Math.abs(c - b) / Math.max(b, floor); sum += Math.min(1, rel / (tol * 2)); if (rel > tol) notes.push(`${label}: ${c}${unit} contro i tuoi soliti ${b}${unit}`); };
  cmp('sentenceLen', 'Frasi ' + (cur.sentenceLen > base.sentenceLen ? 'più lunghe' : 'più corte'), ' parole', 0.3, 8); cmp('wordLen', 'Parole ' + (cur.wordLen > base.wordLen ? 'più lunghe' : 'più corte'), ' lettere', 0.12, 4); cmp('commas', 'Virgole', ' ogni 1000 parole', 0.4, 30); cmp('longSentences', 'Frasi oltre le 30 parole', '%', 0.8, 8); cmp('adverbs', 'Avverbi in -mente', ' ogni 1000 parole', 0.8, 4); cmp('firstPerson', 'Prima persona', ' ogni 1000 parole', 0.9, 5);
  return { score: Math.round((sum / 6) * 100), notes };
}
export const keywords = (s: string): string[] => [...new Set((s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w)).map((w) => w.replace(/(zioni|zione|mente|ità|ali|ale|ari|are|ere|ire|ato|ata|ati|ate|i|e|o|a)$/, '')).filter((w) => w.length >= 4))];
export interface SeedNote { id: string; text: string; createdAt: string }
/** Appunti che maturano: quando almeno tre note condividono una parola chiave, il tema è pronto per diventare un articolo. */
export function ripeThemes(notes: SeedNote[], min = 3): { theme: string; notes: SeedNote[] }[] {
  const map = new Map<string, SeedNote[]>(); for (const n of notes) for (const k of keywords(n.text)) map.set(k, [...(map.get(k) ?? []), n]);
  const themes = [...map.entries()].filter(([, l]) => l.length >= min).sort((a, b) => b[1].length - a[1].length); const used = new Set<string>(); const out: { theme: string; notes: SeedNote[] }[] = [];
  for (const [theme, list] of themes) { const key = list.map((n) => n.id).sort().join(','); if (used.has(key)) continue; used.add(key); out.push({ theme, notes: list }); }
  return out.slice(0, 8);
}
/** Serie di giorni consecutivi di scrittura fino a oggi (o a ieri: la serie non si rompe finché la giornata non è finita). */
export function streak(days: string[], today: string): { current: number; best: number } {
  const set = new Set(days); const prev = (d: string) => new Date(+new Date(`${d}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  let cur = 0; let d = set.has(today) ? today : prev(today); while (set.has(d)) { cur++; d = prev(d); }
  let best = 0; for (const s of set) { if (set.has(new Date(+new Date(`${s}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10))) continue; let n = 0, k = s; while (set.has(k)) { n++; k = prev(k); } best = Math.max(best, n); }
  return { current: cur, best };
}
export interface LiveDatum { key: string; label: string; value: string; source: string; updatedAt: string }
const escAttr = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
/** Numeri collegati alla fonte: {{dato:chiave}} nel testo diventa il valore corrente, con fonte e data al passaggio del mouse. */
export function renderLiveData(html: string, data: LiveDatum[]): string {
  if (!html.includes('{{dato:')) return html;
  return html.replace(/\{\{dato:([a-z0-9_-]+)\}\}/gi, (m, key: string) => { const d = data.find((x) => x.key === key.toLowerCase()); if (!d) return m; const when = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : ''; return `<span class="live-datum" tabindex="0" title="${escAttr(`${d.label}${d.source ? ` · fonte: ${d.source}` : ''}${when ? ` · aggiornato il ${when}` : ''}`)}">${escAttr(d.value)}</span>`; });
}
/** Annotazioni dell'autore a margine: [[nota: …]] resta nascosta finché il lettore non chiede «le note dell'autore». */
export function renderAuthorNotes(html: string): string { return html.includes('[[nota:') ? html.replace(/\[\[nota:\s*([\s\S]*?)\]\]/g, (_, t: string) => `<span class="author-note" role="note"><span class="an-mark" aria-hidden="true">✎</span><span class="an-text">${t.trim()}</span></span>`) : html; }
export const hasAuthorNotes = (html: string): boolean => html.includes('[[nota:');
export interface ExpiringSentence { text: string; date: string; done?: boolean }
export const dueSentences = (list: ExpiringSentence[] | undefined, nowIso: string): ExpiringSentence[] => (list ?? []).filter((s) => !s.done && s.date && s.date <= nowIso.slice(0, 10));
