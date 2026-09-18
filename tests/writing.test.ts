import { describe, expect, it } from 'vitest';
import { dueSentences, renderAuthorNotes, renderLiveData, ripeThemes, streak, styleDrift, styleFingerprint } from '../src/lib/writing';

const plain = Array.from({ length: 30 }, (_, i) => `Il comune ha approvato il bilancio numero ${i}. La giunta ha votato ieri sera. I lavori partono lunedì.`).join(' ');
const baroque = Array.from({ length: 8 }, () => 'Io, personalmente, ritengo che, considerando attentamente e necessariamente tutte le circostanze, le quali, inevitabilmente, si intrecciano profondamente con la nostra storia, sia assolutamente doveroso, per me e per noi tutti, interrogarci lungamente, seriamente e approfonditamente sulla questione?').join(' ');
describe('officina di scrittura', () => {
  it('impronta di stile: lo stesso stile non si allontana, uno stile opposto sì e dice perché', () => {
    const base = styleFingerprint([`<p>${plain}</p>`])!; expect(base.sentenceLen).toBeLessThan(8);
    expect(styleDrift(base, `<p>${plain}</p>`)!.score).toBe(0); const d = styleDrift(base, `<p>${baroque}</p>`)!; expect(d.score).toBeGreaterThan(60); expect(d.notes.join(' ')).toMatch(/Frasi più lunghe/); expect(styleFingerprint(['<p>troppo corto</p>'])).toBeNull();
  });
  it('appunti che maturano: tre note sullo stesso tema fanno un articolo', () => {
    const n = (id: string, t: string) => ({ id, text: t, createdAt: '' }); const themes = ripeThemes([n('1', 'La piscina comunale è chiusa da mesi'), n('2', 'Costi della piscina: chiedere al Comune'), n('3', 'Genitori protestano per le piscine'), n('4', 'Mercato del giovedì spostato')]);
    expect(themes[0].notes.map((x) => x.id)).toEqual(['1', '2', '3']); expect(themes.some((t) => t.notes.some((x) => x.id === '4'))).toBe(false);
  });
  it('serie di giorni: non si rompe finché oggi non è finito', () => { expect(streak(['2026-05-01', '2026-05-02', '2026-05-03'], '2026-05-04')).toEqual({ current: 3, best: 3 }); expect(streak(['2026-05-01', '2026-05-02', '2026-05-10'], '2026-05-10')).toEqual({ current: 1, best: 2 }); expect(streak(['2026-05-01'], '2026-05-09').current).toBe(0); });
  it('dati vivi, note d\'autore e frasi scadute', () => {
    const html = renderLiveData('<p>I residenti sono {{dato:residenti}} e {{dato:ignoto}}.</p>', [{ key: 'residenti', label: 'Residenti', value: '48.312', source: 'ISTAT', updatedAt: '2026-01-01' }]); expect(html).toContain('>48.312</span>'); expect(html).toContain('fonte: ISTAT'); expect(html).toContain('{{dato:ignoto}}');
    expect(renderAuthorNotes('<p>Testo [[nota: qui ho tagliato molto]] fine</p>')).toContain('<span class="an-text">qui ho tagliato molto</span>');
    expect(dueSentences([{ text: 'a', date: '2026-01-01' }, { text: 'b', date: '2027-01-01' }, { text: 'c', date: '2025-01-01', done: true }], '2026-06-01T00:00:00Z').map((s) => s.text)).toEqual(['a']);
  });
});
