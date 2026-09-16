import { describe, expect, it } from 'vitest';
import { IMAGE_SLOTS, sizesFor } from '../src/lib/image-slots';
import { adviceFor, scoreColor } from '../src/lib/pagespeed-core';

describe('slot immagine', () => {
  it('le immagini lazy usano sizes="auto" con elenco di riserva', () => {
    expect(sizesFor('card')).toMatch(/^auto, /);
    expect(sizesFor('card')).toContain('calc(100vw - 80px)');
  });
  it('le immagini prioritarie non usano auto (non sono lazy)', () => {
    expect(sizesFor('hero', true)).not.toMatch(/auto/);
    expect(sizesFor('cover', true)).toContain('800px');
  });
  it('ogni slot ha una regola valida', () => {
    for (const s of IMAGE_SLOTS) expect(sizesFor(s, true)).toMatch(/\d+(px|vw)/);
  });
});
describe('consigli PageSpeed', () => {
  it('mappa le segnalazioni note su azioni nel CMS e ha un fallback', () => {
    expect(adviceFor('image-delivery-insight')).toContain('Libreria media');
    expect(adviceFor('audit-inesistente')).toContain('PageSpeed');
    expect(scoreColor(95)).toBe('#0b7a4b'); expect(scoreColor(70)).toBe('#e67e00'); expect(scoreColor(20)).toBe('#d7262d');
  });
});
