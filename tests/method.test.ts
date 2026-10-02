import { describe, expect, it } from 'vitest';
import { lexiconCheck, mentions, parseLexicon, publishGate } from '../src/lib/method';

describe('redazione e metodo', () => {
  it('lessico: trova le parole da evitare come parole intere', () => { const rules = parseLexicon('extracomunitario => cittadino straniero | preferire la nazionalità\ndramma =>'); expect(rules).toHaveLength(2); const r = lexiconCheck('<p>Un dramma: due extracomunitari e un extracomunitario.</p>', rules); expect(r.map((x) => [x.avoid, x.count])).toEqual([['extracomunitario', 1], ['dramma', 1]]); });
  it('persone citate', () => { expect(mentions('Il sindaco Mario Rossi ha detto', [{ name: 'Mario Rossi' }, { name: 'Anna Bianchi' }, { name: 'Lu' }]).map((c) => c.name)).toEqual(['Mario Rossi']); });
  it('cancelli: check-list, due fonti, rilettura; mai per un pezzo già pubblicato', () => {
    const m = { checklists: { cronaca: 'Nomi verificati\nMinori tutelati', default: 'Titolo letto due volte' }, twoSources: true, crossReadKinds: ['inchiesta'] };
    expect(publishGate(m, { kind: 'cronaca', checked: ['Nomi verificati'], sources: 1, authorId: 'a', publisherId: 'a', wasPublished: false })).toHaveLength(2);
    expect(publishGate(m, { kind: 'cronaca', checked: ['Nomi verificati', 'Minori tutelati'], sources: 2, authorId: 'a', publisherId: 'a', wasPublished: false })).toEqual([]);
    expect(publishGate(m, { kind: 'inchiesta', checked: ['Titolo letto due volte'], sources: 3, authorId: 'a', reviewedBy: 'a', publisherId: 'b', wasPublished: false })[0]).toMatch(/diverso/);
    expect(publishGate(m, { kind: 'inchiesta', checked: ['Titolo letto due volte'], sources: 3, authorId: 'a', reviewedBy: 'c', publisherId: 'b', wasPublished: false })).toEqual([]);
    expect(publishGate(m, { kind: 'cronaca', checked: [], sources: 0, authorId: 'a', publisherId: 'a', wasPublished: true })).toEqual([]); expect(publishGate(undefined, { checked: [], sources: 0, authorId: 'a', publisherId: 'a', wasPublished: false })).toEqual([]);
  });
});
