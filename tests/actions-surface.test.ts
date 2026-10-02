import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Tutto ciò che un file 'use server' esporta è richiamabile dal browser. Qui deve esserci solo roba che si chiama *Action: le letture per le pagine stanno nei moduli server-only. */
describe('superficie delle azioni server', () => {
  it('i file \'use server\' esportano solo funzioni *Action', () => {
    const bad: string[] = [];
    for (const f of readdirSync('src/lib').filter((x) => x.startsWith('actions') && x.endsWith('.ts'))) {
      const s = readFileSync(`src/lib/${f}`, 'utf8'); if (!s.trimStart().startsWith("'use server'")) continue;
      for (const m of s.matchAll(/^export (?:async )?(?:function|const) (\w+)/gm)) if (!m[1].endsWith('Action')) bad.push(`${f}: ${m[1]}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
