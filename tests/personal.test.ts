import { describe, expect, it } from 'vitest';
import { activeSeason, countdown, homeFromActivity, legacyState, onThisDay, parseNow } from '../src/lib/personal';
import { crc32, zipStore } from '../src/lib/zip';
import { buildEpub, toXhtml } from '../src/lib/book';

describe('blog personale e forma del sito', () => {
  it('un anno fa oggi: stesso giorno, anni passati, dal più vicino', () => { const r = onThisDay([{ id: 'a', publishedAt: '2024-09-18T10:00:00Z' }, { id: 'b', publishedAt: '2026-09-18T08:00:00Z' }, { id: 'c', publishedAt: '2021-09-18T08:00:00Z' }, { id: 'd', publishedAt: '2024-09-19T08:00:00Z' }], '2026-09-18'); expect(r.map((x) => [x.id, x.yearsAgo])).toEqual([['a', 2], ['c', 5]]); });
  it('stagioni: ricorrenti, a cavallo d\'anno e una tantum', () => {
    const s = [{ id: 'n', name: 'Natale', from: '12-08', to: '01-06' }, { id: 'e', name: 'Elezioni', from: '2027-05-01', to: '2027-05-20' }];
    expect(activeSeason(s, '2026-12-25')?.id).toBe('n'); expect(activeSeason(s, '2027-01-03')?.id).toBe('n'); expect(activeSeason(s, '2027-05-10')?.id).toBe('e'); expect(activeSeason(s, '2028-05-10')).toBeNull(); expect(activeSeason(s, '2026-07-01')).toBeNull();
  });
  it('testamento digitale: avvisa un mese prima, scatta alla soglia, una volta sola', () => {
    const l = { enabled: true, days: 365, action: 'freeze' as const, heirName: '', heirEmail: '', message: '' }; const now = +new Date('2026-09-18'); const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();
    expect(legacyState(l, ago(10), now)).toBe('ok'); expect(legacyState(l, ago(340), now)).toBe('warning'); expect(legacyState(l, ago(400), now)).toBe('due'); expect(legacyState({ ...l, triggeredAt: 'x' }, ago(1), now)).toBe('triggered'); expect(legacyState({ ...l, enabled: false }, ago(999), now)).toBe('off');
  });
  it('conto alla rovescia, home dall\'attività, messaggi al bot', () => {
    expect(countdown('2026-10-01T00:00:00Z', +new Date('2026-09-18T00:00:00Z'))).toEqual({ days: 13, over: false }); expect(countdown('2026-01-01', +new Date('2026-09-18')).over).toBe(true);
    expect(homeFromActivity([{ format: 'gallery', words: 50 }, { format: 'gallery', words: 10 }, { format: 'video', words: 5 }, { format: 'standard', words: 300 }])).toBe('grid'); expect(homeFromActivity(Array(5).fill({ format: 'standard', words: 2000 }))).toBe('magazine'); expect(homeFromActivity(Array(5).fill({ format: 'standard', words: 300 }))).toBeNull();
    expect(parseNow('leggo: Il Gattopardo; ascolto Paolo Conte')).toEqual({ reading: 'Il Gattopardo', listening: 'Paolo Conte' }); expect(parseNow('Settimana di trasloco', { reading: 'x' })).toEqual({ reading: 'x', note: 'Settimana di trasloco' });
  });
  it('zip ed epub: struttura valida, mimetype per primo e non compresso, xhtml pulito', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926); const z = zipStore([{ name: 'a.txt', data: 'ciao' }]); expect([...z.slice(0, 4)]).toEqual([0x50, 0x4b, 3, 4]); expect([...z.slice(-22, -18)]).toEqual([0x50, 0x4b, 5, 6]);
    const epub = buildEpub({ title: 'Il mio anno', author: 'Enzo', id: 'urn:x', date: '2026-09-18T00:00:00.000Z' }, [{ title: 'Uno & due', date: '1 gennaio', html: '<p onclick="x()">Testo&nbsp;<br><img src="a.jpg"></p><script>bad()</script>' }]); const txt = new TextDecoder().decode(epub);
    expect(txt.slice(30, 38)).toBe('mimetype'); expect(txt.slice(38, 58)).toBe('application/epub+zip'); expect(txt).toContain('Uno &amp; due'); expect(txt).not.toContain('bad()'); expect(toXhtml('<p class="x">A & B<br></p>')).toBe('<p>A &amp; B<br/></p>');
  });
});
