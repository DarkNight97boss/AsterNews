import { describe, expect, it } from 'vitest';
import { monthAlbum, radioScript, shortPush, toBrf } from '../src/lib/formats';

describe('formati e dispositivi', () => {
  it('braille BRF: maiuscole, numeri, accenti, righe da 40 celle, pagine da 25 righe', () => { const b = toBrf('Ciao 12, è ora!'); expect(b.startsWith('.ciao #ab1 ! ora6')).toBe(true); const long = toBrf('parola '.repeat(400)); expect(long.split('\r\n').every((l) => l.length <= 40)).toBe(true); expect(long).toContain('\f'); expect(toBrf('Perché?')).toBe('.perch=8\r\n'); });
  it('notifica da orologio e album del mese', () => { expect(shortPush('uno due tre quattro cinque sei sette otto nove dieci undici dodici tredici')).toBe('uno due tre quattro cinque sei sette otto nove dieci undici dodici…'); expect(shortPush('corto')).toBe('corto'); const alb = monthAlbum([{ publishedAt: '2026-09-02', coverImage: 'a.jpg', coverCaption: '', gallery: [{ url: 'b.jpg', caption: 'B' }, { url: 'a.jpg' }], title: 'T1' }, { publishedAt: '2026-08-30', coverImage: 'c.jpg', coverCaption: 'C', gallery: [], title: 'T2' }], '2026-09'); expect(alb.map((x) => x.url)).toEqual(['a.jpg', 'b.jpg']); expect(alb[0].caption).toBe('T1'); });
  it('copione della radio entro le parole', () => { const s = radioScript('Aster', 'lunedì 5', Array.from({ length: 50 }, (_, i) => ({ title: `Titolo ${i}`, excerpt: 'parola '.repeat(40) }))); expect(s.split(' ').length).toBeLessThan(800); expect(s).toContain('Buona giornata.'); });
});
