import { describe, expect, it } from 'vitest';
import { COMMUNITY, collectiveYear, decadeOf, nextSession, publicData, tally, validateContribution, waitingDays } from '../src/lib/community';

describe('comunità', () => {
  it('validazione dei contributi: obbligatori, lunghezze, email, elenchi, markup rimosso', () => {
    const d = COMMUNITY.board; expect(validateContribution(d, { what: 'Ho perso', title: 'Chiavi', text: 'x'.repeat(20), contact: '333 1234567' })).toMatchObject({ ok: true });
    expect(validateContribution(d, { what: 'Vendo', title: 'Chiavi di casa', text: 'x'.repeat(20), contact: '333 1234567' })).toMatchObject({ ok: false }); expect(validateContribution(d, { what: 'Ho perso', title: 'Ch', text: 'x'.repeat(20), contact: '33312345' })).toMatchObject({ ok: false });
    expect(validateContribution(COMMUNITY.skill, { name: 'Anna Bianchi', email: 'non-email', field: 'Idraulica', about: 'x'.repeat(30) })).toMatchObject({ ok: false, message: expect.stringContaining('email') });
    const ok = validateContribution(COMMUNITY.council, { text: 'Quando riapre <b>la piscina</b> comunale?' }); expect(ok.ok && ok.data.text).toBe('Quando riapre bla piscina/b comunale?');
    expect(validateContribution(COMMUNITY.photo, { image: 'data:text/html;base64,AAAA', caption: 'Piazza', place: 'Piazza Duomo' })).toMatchObject({ ok: false });
  });
  it('i campi privati non escono mai in pubblico', () => { expect(publicData(COMMUNITY.skill, { name: 'Anna', email: 'a@b.it', field: 'Idraulica', about: 'x', token: 't' })).toEqual({ field: 'Idraulica', about: 'x' }); });
  it('giorni di attesa, datazione collettiva, decenni, voti, prossima ora di ascolto', () => {
    expect(waitingDays('2026-09-01T00:00:00Z', undefined, +new Date('2026-09-18T00:00:00Z'))).toBe(17); expect(waitingDays('2026-09-01', '2026-09-05', 0)).toBe(4); expect(waitingDays(undefined, undefined, 0)).toBeNull();
    expect(collectiveYear([1958, 1962, 1960, 1975])).toEqual({ year: 1961, spread: 17, votes: 4 }); expect(collectiveYear([])).toBeNull(); expect(decadeOf(1964)).toBe("Anni '60"); expect(decadeOf(2003)).toBe('Anni 2000');
    expect(tally([{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }], ['a', 'b', 'b', 'zzz']).map((x) => [x.id, x.votes, x.percent])).toEqual([['b', 2, 67], ['a', 1, 33]]);
    const n = nextSession(4, '18:30', new Date('2026-09-18T10:00:00')); expect(n.getDay()).toBe(4); expect(n.getDate()).toBe(24); expect(nextSession(5, '18:30', new Date('2026-09-18T10:00:00')).getDate()).toBe(18);
  });
});
