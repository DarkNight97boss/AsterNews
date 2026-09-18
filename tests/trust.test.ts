import { describe, expect, it } from 'vitest';
import { canonicalText, isAbandoned, nutritionLabel, predictionScore, textHash } from '../src/lib/trust';

describe('fiducia e trasparenza', () => {
  it('l\'impronta ignora markup e spazi ma non le parole', () => {
    expect(canonicalText(' Titolo ', '<p>Ciao   <b>mondo</b></p><script>x()</script>')).toBe('Titolo\nCiao mondo');
    expect(textHash('T', '<p>Ciao mondo</p>')).toBe(textHash('T', '<div>Ciao&nbsp;mondo</div>')); expect(textHash('T', '<p>Ciao mondo</p>')).not.toBe(textHash('T', '<p>Ciao mondi</p>'));
  });
  it('l\'etichetta conta fonti, giorni di lavoro, AI e correzioni; senza tipo non esiste', () => {
    const base = { sponsored: false, createdAt: '2026-01-01T08:00:00Z', publishedAt: '2026-01-04T08:00:00Z' };
    expect(nutritionLabel({ ...base, extra: {} }, 3)).toBeNull();
    const l = nutritionLabel({ ...base, extra: { label: { kind: 'inchiesta', onSite: true, docs: 12 }, sources: [{ name: 'A', contact: '', note: '', verified: true }, { name: ' ', contact: '', note: '', verified: false }], aiUsed: ['title'], corrections: [{ date: 'x', text: 'y' }] } }, 7)!;
    expect(l).toMatchObject({ kind: 'Inchiesta', sources: 1, verified: 1, docs: 12, onSite: true, revisions: 7, days: 3, ai: true, corrections: 1 });
  });
  it('una storia è «lasciata a metà» solo se aperta e ferma da tempo', () => {
    const now = +new Date('2026-06-01'); const old = '2026-03-01T00:00:00Z', fresh = '2026-05-25T00:00:00Z';
    expect(isAbandoned({ status: 'published', updatedAt: old, extra: { verification: { state: 'developing' } } }, now)).toBe(true);
    expect(isAbandoned({ status: 'published', updatedAt: fresh, extra: { openQuestions: ['?'] } }, now)).toBe(false);
    expect(isAbandoned({ status: 'published', updatedAt: old, extra: { verification: { state: 'confirmed' } } }, now)).toBe(false);
    expect(isAbandoned({ status: 'draft', updatedAt: old, extra: { openQuestions: ['?'] } }, now)).toBe(false);
  });
  it('punteggio delle previsioni', () => { expect(predictionScore(['right', 'right', 'partial', 'wrong'])).toMatchObject({ total: 4, percent: 63 }); expect(predictionScore([]).percent).toBeNull(); });
});
