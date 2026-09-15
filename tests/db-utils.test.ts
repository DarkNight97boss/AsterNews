import { describe, expect, it } from 'vitest';
import { mergeInserts, toPg } from '../src/lib/db';
import { expandQuery } from '../src/lib/repo';

describe('utilità database', () => {
  it('converte i segnaposto ? in $n ignorando quelli dentro le stringhe', () => {
    expect(toPg('SELECT * FROM a WHERE x = ? AND y = ?')).toBe('SELECT * FROM a WHERE x = $1 AND y = $2');
    expect(toPg("SELECT '?' AS q, x FROM a WHERE x = ?")).toBe("SELECT '?' AS q, x FROM a WHERE x = $1");
  });
  it('unisce INSERT consecutivi identici in un solo INSERT multi-riga', () => {
    const stmts = [
      { sql: 'INSERT INTO tags (id, slug, name) VALUES (?,?,?) ON CONFLICT (id) DO NOTHING', args: ['t1', 'a', 'A'] },
      { sql: 'INSERT INTO tags (id, slug, name) VALUES (?,?,?) ON CONFLICT (id) DO NOTHING', args: ['t2', 'b', 'B'] },
      { sql: 'DELETE FROM x WHERE id = ?', args: ['1'] },
      { sql: 'INSERT INTO tags (id, slug, name) VALUES (?,?,?) ON CONFLICT (id) DO NOTHING', args: ['t3', 'c', 'C'] },
    ];
    const m = mergeInserts(stmts);
    expect(m).toHaveLength(3);
    expect(m[0].sql).toContain('VALUES (?,?,?),(?,?,?) ON CONFLICT');
    expect(m[0].args).toEqual(['t1', 'a', 'A', 't2', 'b', 'B']);
    expect(m[1].sql).toContain('DELETE');
  });
  it('espande i sinonimi nella query full-text', () => {
    expect(expandQuery('comune scuola', { comune: ['municipio'] })).toBe('(comune | municipio) & scuola');
    expect(expandQuery('municipio', { comune: ['municipio'] })).toBe('(municipio | comune)');
  });
});
