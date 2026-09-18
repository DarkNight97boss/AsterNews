import { describe, expect, it } from 'vitest';
import { codeFromBytes, depthForMinutes, entityCard, mindShift, normalizeCode, paragraphsForMinutes, placeSlug, territory, topHighlights } from '../src/lib/reading';

describe('lettura', () => {
  it('codice di tre parole: stabile e tollerante a maiuscole, accenti e spazi', () => { const c = codeFromBytes([0, 1, 2]); expect(c).toBe('mare-sole-luna'); expect(normalizeCode('  Mare  SOLE,luna ')).toBe(c); });
  it('lettura a tempo: paragrafi che stanno nel tempo, mai zero; profondità giusta per gli articoli a strati', () => { expect(paragraphsForMinutes([100, 100, 300, 400], 2)).toBe(2); expect(paragraphsForMinutes([900, 100], 1)).toBe(1); expect(paragraphsForMinutes([50, 50], 10)).toBe(2); expect(depthForMinutes([1, 4, 9], 5)).toBe(2); expect(depthForMinutes([3, 6, 9], 1)).toBe(1); });
  it('evidenziazioni collettive: conta le stesse frasi, scarta le isolate', () => { const t = topHighlights(['Il ponte costerà dodici milioni', 'il ponte costerà  dodici milioni', 'Il ponte costerà dodici milioni', 'Una frase sola soletta qui', 'Seconda frase ripetuta due volte', 'Seconda frase ripetuta due volte']); expect(t.map((x) => x.count)).toEqual([3, 2]); expect(t[0].weight).toBe(3); expect(t[1].weight).toBe(2); });
  it('ho cambiato idea', () => { expect(mindShift([{ before: 'si', after: 'no' }, { before: 'si', after: 'si' }, { before: 'forse', after: 'si' }, { before: 'no', after: 'no' }])).toMatchObject({ total: 4, changed: 2, percent: 50, after: { si: 2, no: 2, forse: 0 } }); expect(mindShift([])).toBeNull(); });
  it('scheda dall\'archivio e slug dei luoghi', () => {
    const c = entityCard([{ publishedAt: '2024-03-01', tagIds: ['t1', 't2'], zoneId: 'z1' }, { publishedAt: '2026-01-05', tagIds: ['t1', 't2', 't3'], zoneId: 'z1' }, { publishedAt: '2026-02-01', tagIds: ['t1'], zoneId: '' }], 't1');
    expect(c).toMatchObject({ count: 3, first: '2024-03-01', last: '2026-02-01', perYear: [{ year: '2024', n: 1 }, { year: '2026', n: 2 }], coTags: [{ id: 't2', n: 2 }], zones: [{ id: 'z1', n: 2 }] });
    expect(placeSlug('Via Roma, 12/b')).toBe('via-roma'); expect(placeSlug('via Roma n. 4')).toBe('via-roma');
  });
  it('territorio: punti dentro la propria regione, posizione stabile', () => { const arts = Array.from({ length: 30 }, (_, i) => ({ id: `a${i}`, categoryId: i % 2 ? 'c1' : 'c2' })); const t = territory(arts, ['c1', 'c2', 'vuota']); expect(t.regions).toHaveLength(2); for (const p of t.points) { const r = t.regions.find((x) => x.id === p.categoryId)!; expect(Math.hypot(p.x - r.x, p.y - r.y)).toBeLessThanOrEqual(r.r); } expect(territory(arts, ['c1', 'c2']).points[3]).toEqual(t.points[3]); });
});
