import { describe, expect, it } from 'vitest';
import { classroomFallback, familyTags, fitsAge, guessTitle, voiceTwiml, wordSearch } from '../src/lib/school';

describe('scuola, giovani, anziani', () => {
  it('parole nascoste: tutte le parole stanno nella griglia e la griglia è deterministica', () => {
    const w = wordSearch(['Comune', 'piscina', 'sindaco', 'ponte', 'scuola', 'mercato'], 7); expect(w.skipped).toEqual([]); for (const p of w.placed) { let s = ''; for (let i = 0; i < p.word.length; i++) s += w.grid[p.row + p.dr * i][p.col + p.dc * i]; expect(s).toBe(p.word); }
    expect(wordSearch(['Comune', 'piscina'], 7).grid).toEqual(wordSearch(['Comune', 'piscina'], 7).grid); expect(w.grid.every((row) => row.every((c) => /^[A-Z]$/.test(c)))).toBe(true);
  });
  it('indovina il titolo e agenda per famiglie', () => { const q = guessTitle([{ title: 'A', excerpt: 'a' }, { title: 'B', excerpt: 'b' }, { title: 'C', excerpt: 'c' }], 3); expect(q).toHaveLength(3); expect(q[0].options[q[0].answer]).toBe(q[0].options.find((o) => o === 'A' || o === 'B' || o === 'C')); for (const x of q) expect(new Set(x.options).size).toBe(3);
    const t = familyTags('Laboratorio di ceramica #eta3-6 #passeggino #gratis'); expect(t).toEqual({ ageFrom: 3, ageTo: 6, stroller: true, free: true, indoor: false }); expect(fitsAge(t, 4)).toBe(true); expect(fitsAge(t, 9)).toBe(false); expect(fitsAge(familyTags('niente'), 40)).toBe(true); expect(familyTags('#eta12+').ageTo).toBe(99); });
  it('domande per la classe e segreteria telefonica', () => { const c = classroomFallback('Titolo', 'Il consiglio comunale ha approvato ieri sera il nuovo regolamento sulla raccolta differenziata porta a porta. Partirà a gennaio in tutti i quartieri della città.'); expect(c.questions.length).toBeGreaterThanOrEqual(5); expect(c.questions.some((q) => q.includes('raccolta differenziata'))).toBe(true); expect(c.glossary.some((g) => g.term === 'differenziata')).toBe(true);
    const x = voiceTwiml('Aster & Co', [{ title: 'Ponte chiuso', excerpt: 'Da lunedì.' }], 'https://a.it/r.mp3'); expect(x).toContain('<Play>https://a.it/r.mp3</Play>'); expect(x).toContain('Aster &amp; Co'); expect(x).toContain('Notizia 1. Ponte chiuso.'); });
});
