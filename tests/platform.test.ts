import { describe, expect, it } from 'vitest';
import { buildManual, byteReport, oneKb, parseExif, reverseSearchLinks, uiWord } from '../src/lib/platform';

/** Costruisce un JPEG finto con un blocco EXIF (little endian): Make, DateTime, GPS. */
function fakeJpeg(): Uint8Array {
  const le16 = (n: number) => [n & 0xff, n >> 8], le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
  const make = 'Canon\0', date = '2026:10:02 10:00:00\0';
  // layout dopo l'intestazione TIFF (offset relativi a tiff): IFD0 a 8 (3 voci = 2+36+4 = 42 byte → fine a 50), make a 50, date a 56, GPS IFD a 76, razionali lat a 76+2+48+4=130, lon a 154
  const ifd0 = [...le16(3), ...le16(0x010f), ...le16(2), ...le32(make.length), ...le32(50), ...le16(0x0132), ...le16(2), ...le32(date.length), ...le32(56), ...le16(0x8825), ...le16(4), ...le32(1), ...le32(76), ...le32(0)];
  const rat = (a: number, b: number) => [...le32(a), ...le32(b)]; const gps = [...le16(4), ...le16(0x0001), ...le16(2), ...le32(2), 0x4e, 0, 0, 0, ...le16(0x0002), ...le16(5), ...le32(3), ...le32(130), ...le16(0x0003), ...le16(2), ...le32(2), 0x45, 0, 0, 0, ...le16(0x0004), ...le16(5), ...le32(3), ...le32(154), ...le32(0)];
  const tiff = [0x49, 0x49, 0x2a, 0, ...le32(8), ...ifd0, ...[...make].map((c) => c.charCodeAt(0)), ...[...date].map((c) => c.charCodeAt(0)), ...gps, ...rat(45, 1), ...rat(30, 1), ...rat(0, 1), ...rat(9, 1), ...rat(11, 1), ...rat(0, 1)];
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]; const app1 = [0xff, 0xe1, ...[(exif.length + 2) >> 8, (exif.length + 2) & 0xff], ...exif];
  return new Uint8Array([0xff, 0xd8, ...app1, 0xff, 0xda, 0, 2]);
}
describe('piattaforma', () => {
  it('EXIF: produttore, data, GPS', () => { const e = parseExif(fakeJpeg()); expect(e.make).toBe('Canon'); expect(e.dateTime).toBe('2026:10:02 10:00:00'); expect(e.lat).toBeCloseTo(45.5, 3); expect(e.lon).toBeCloseTo(9.1833, 3); expect(parseExif(new Uint8Array([1, 2, 3]))).toEqual({}); });
  it('ricerca inversa e parole locali', () => { expect(reverseSearchLinks('https://a.it/x.jpg')).toHaveLength(4); expect(uiWord({ zone: 'Rioni' }, 'zone')).toBe('Rioni'); expect(uiWord({}, 'zone')).toBe('Zone'); expect(uiWord(undefined, 'eventi')).toBe('Cosa fare in città'); });
  it('budget di byte', () => { const r = byteReport([{ path: '/', bytes: 300_000 }, { path: '/a', bytes: 90_000 }], 200); expect(r.over.map((x) => x.path)).toEqual(['/']); expect(r.over[0].pct).toBe(146); expect(r.worst?.path).toBe('/'); });
  it('pagina da un kilobyte', () => { const html = oneKb('Aster', Array.from({ length: 40 }, (_, i) => ({ title: `Titolo molto lungo numero ${i} con tante parole dentro per riempire`, url: `/1k/a${i}` }))); expect(new TextEncoder().encode(html).length).toBeLessThanOrEqual(1024); expect(html).toContain('/1k/a0'); });
  it('manuale', () => { const m = buildManual({ siteName: 'X', nav: [{ href: '/admin/a', label: 'A', group: 'Contenuti' }], kinds: [{ kind: 'k', title: 'K', fields: [{ label: 'f', required: true }], perHour: 3 }], cards: [{ kind: 'c', name: 'C', hint: 'h', group: 'citta' }], pages: [{ path: '/p', title: 'P' }] }); expect(m).toContain('### Contenuti'); expect(m).toContain('f*'); expect(m).toContain('/schede/c'); });
});
