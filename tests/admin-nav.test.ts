import { describe, expect, it } from 'vitest';
import { NAV, arrangeNav, vocabularyOf } from '../src/lib/admin-nav';

const hrefs = (l: { href: string }[]) => l.map((x) => x.href);
describe('menu che si adatta', () => {
  it('il quotidiano in squadra vede quasi tutto in primo piano', () => { const r = arrangeNav(NAV, { profile: 'quotidiano', autoHide: true }, { solo: false, used: [], mature: false }); expect(hrefs(r.more)).toEqual(['/admin/personale', '/admin/uscita']); });
  it('il blog personale da soli: niente desk, zone, annunci, utenti in primo piano', () => {
    const r = arrangeNav(NAV, { profile: 'blog', autoHide: true }, { solo: true, used: [], mature: false });
    for (const h of ['/admin/redazione', '/admin/zone', '/admin/annunci', '/admin/utenti', '/admin/scaletta', '/admin/edizioni']) expect(hrefs(r.more)).toContain(h);
    for (const h of ['/admin/articoli', '/admin/scrivi', '/admin/media', '/admin/impostazioni', '/admin/adatta', '/admin/commenti']) expect(hrefs(r.main)).toContain(h);
    expect(hrefs(r.main)).toContain('/admin/personale'); expect(r.main.length).toBeLessThan(NAV.length - 15);
  });
  it('dopo un mese le voci mai aperte scendono in «Altro», quelle usate o fissate restano', () => {
    const r = arrangeNav(NAV, { profile: 'quotidiano', autoHide: true, pinned: ['/admin/backup'] }, { solo: false, used: ['/admin/eventi/biglietti', '/admin/commenti'], mature: true });
    expect(hrefs(r.main)).toEqual(expect.arrayContaining(['/admin/eventi', '/admin/commenti', '/admin/backup', '/admin/articoli', '/admin/guida'])); expect(hrefs(r.more)).toContain('/admin/edizioni');
  });
  it('una voce fuori profilo torna in primo piano se la usi', () => { expect(hrefs(arrangeNav(NAV, { profile: 'diario', autoHide: true }, { solo: true, used: ['/admin/pubblicita'], mature: true }).main)).toContain('/admin/pubblicita'); });
  it('con autoHide spento non sparisce nulla del profilo', () => { expect(hrefs(arrangeNav(NAV, { profile: 'quotidiano', autoHide: false }, { solo: false, used: [], mature: true }).more)).toEqual(['/admin/personale', '/admin/uscita']); });
  it('vocabolario: il blog parla di post, e si può personalizzare', () => {
    expect(arrangeNav(NAV, { profile: 'blog', autoHide: false }, { solo: true, used: [], mature: false }).main.find((x) => x.href === '/admin/articoli')?.label).toBe('Post');
    expect(vocabularyOf({ profile: 'diario', autoHide: true, vocabulary: { articles: 'ricette' } }).articles).toBe('ricette'); expect(vocabularyOf({ profile: 'diario', autoHide: true, vocabulary: { articles: ' ' } }).articles).toBe('appunti');
  });
});
