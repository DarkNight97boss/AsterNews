/** Scuola, giovani, anziani: giochi dal giornale, agenda per famiglie, domande per la classe, segreteria telefonica. Solo funzioni pure. */
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
export const seedOf = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export interface WordSearch { size: number; grid: string[][]; placed: { word: string; row: number; col: number; dr: number; dc: number }[]; skipped: string[] }
const norm = (w: string) => w.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');
/** Parole nascoste: griglia quadrata con le parole in orizzontale, verticale e diagonale; deterministica dato il seme. */
export function wordSearch(words: string[], seed = 1, size?: number): WordSearch {
  const list = [...new Set(words.map(norm).filter((w) => w.length >= 3 && w.length <= 14))].sort((a, b) => b.length - a.length).slice(0, 14); const n = size ?? Math.max(10, Math.min(16, (list[0]?.length ?? 8) + 2)); const g: string[][] = Array.from({ length: n }, () => Array(n).fill('')); const r = rng(seed); const dirs = [[0, 1], [1, 0], [1, 1], [0, -1], [-1, 0], [-1, 1], [1, -1], [-1, -1]]; const placed: WordSearch['placed'] = []; const skipped: string[] = [];
  for (const w of list) { let ok = false; for (let t = 0; t < 200 && !ok; t++) { const [dr, dc] = dirs[Math.floor(r() * dirs.length)]; const row = Math.floor(r() * n), col = Math.floor(r() * n); const er = row + dr * (w.length - 1), ec = col + dc * (w.length - 1); if (er < 0 || ec < 0 || er >= n || ec >= n) continue; let fits = true; for (let i = 0; i < w.length; i++) { const c = g[row + dr * i][col + dc * i]; if (c && c !== w[i]) { fits = false; break; } } if (!fits) continue; for (let i = 0; i < w.length; i++) g[row + dr * i][col + dc * i] = w[i]; placed.push({ word: w, row, col, dr, dc }); ok = true; } if (!ok) skipped.push(w); }
  const letters = 'AEIOUABCDEFGHILMNOPRSTUVZ'; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (!g[i][j]) g[i][j] = letters[Math.floor(r() * letters.length)];
  return { size: n, grid: g, placed, skipped };
}
/** «Indovina il titolo»: per ogni articolo, il sommario e tre titoli tra cui scegliere. */
export function guessTitle<T extends { title: string; excerpt: string }>(arts: T[], seed = 1): { excerpt: string; options: string[]; answer: number }[] {
  const r = rng(seed); const pool = arts.filter((a) => a.excerpt && a.title); return pool.slice(0, 6).map((a) => { const others = pool.filter((x) => x !== a).sort(() => r() - 0.5).slice(0, 2).map((x) => x.title); const options = [a.title, ...others].sort(() => r() - 0.5); return { excerpt: a.excerpt, options, answer: options.indexOf(a.title) }; }).filter((q) => q.options.length === 3);
}
/** Agenda per famiglie: etichette nel testo dell'evento, es. #eta3-6 #passeggino #gratis #alcoperto. */
export function familyTags(text: string): { ageFrom: number | null; ageTo: number | null; stroller: boolean; free: boolean; indoor: boolean } {
  const m = /#eta(\d{1,2})-(\d{1,2})/i.exec(text) ?? /#eta(\d{1,2})\+/i.exec(text); return { ageFrom: m ? Number(m[1]) : null, ageTo: m && m[2] ? Number(m[2]) : m ? 99 : null, stroller: /#passeggino/i.test(text), free: /#gratis/i.test(text), indoor: /#alcoperto/i.test(text) };
}
export const fitsAge = (t: ReturnType<typeof familyTags>, age: number): boolean => t.ageFrom === null || (age >= t.ageFrom && age <= (t.ageTo ?? 99));
/** Domande di comprensione senza AI: dai primi fatti dell'articolo. */
export function classroomFallback(title: string, text: string): { questions: string[]; glossary: { term: string; meaning: string }[] } {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter((s) => s.length > 40).slice(0, 4);
  const questions = ['Di cosa parla l\'articolo? Rispondi in una frase.', 'Chi sono le persone o gli enti coinvolti?', 'Dove e quando succede quello che racconta?', ...sentences.slice(0, 2).map((s) => `Spiega con parole tue: «${s.slice(0, 120)}${s.length > 120 ? '…' : ''}»`), 'Secondo te perché il giornale ha scelto questo titolo: «' + title + '»?', 'Cosa vorresti chiedere a chi ha scritto l\'articolo?'];
  const long = [...new Set((text.toLowerCase().match(/[a-zàèéìòù]{10,}/g) ?? []))].slice(0, 6); return { questions, glossary: long.map((w) => ({ term: w, meaning: '' })) };
}
const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c] as string));
/** Segreteria telefonica: risposta TwiML con le notizie lette da una voce, più un eventuale file audio. */
export function voiceTwiml(siteName: string, items: { title: string; excerpt: string }[], audioUrl?: string): string {
  const say = (t: string) => `<Say language="it-IT">${xml(t)}</Say>`; const parts = [say(`Benvenuto al notiziario telefonico di ${siteName}.`)];
  if (audioUrl) parts.push(`<Play>${xml(audioUrl)}</Play>`); items.slice(0, 6).forEach((it, i) => parts.push(say(`Notizia ${i + 1}. ${it.title}. ${it.excerpt}`), '<Pause length="1"/>')); parts.push(say('Fine delle notizie. Grazie per aver chiamato.'));
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${parts.join('')}</Response>`;
}
