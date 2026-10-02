/** Piattaforma: funzioni pure (EXIF, ricerca inversa, parole locali, budget di byte, manuale, pagina da 1 kB). */
export interface Exif { make?: string; model?: string; software?: string; dateTime?: string; dateTimeOriginal?: string; lat?: number; lon?: number }
/** Lettore EXIF minimo per JPEG: produttore, modello, software, date, GPS. Niente dipendenze. */
export function parseExif(bytes: Uint8Array): Exif {
  const out: Exif = {}; if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return out;
  let p = 2; let tiff = -1;
  while (p + 4 < bytes.length && bytes[p] === 0xff) { const marker = bytes[p + 1]; const len = (bytes[p + 2] << 8) | bytes[p + 3]; if (marker === 0xe1 && bytes[p + 4] === 0x45 && bytes[p + 5] === 0x78 && bytes[p + 6] === 0x69 && bytes[p + 7] === 0x66) { tiff = p + 10; break; } if (marker === 0xda) break; p += 2 + len; }
  if (tiff < 0 || tiff + 8 > bytes.length) return out;
  const le = bytes[tiff] === 0x49; const u16 = (o: number) => (le ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]); const u32 = (o: number) => (le ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16)) + bytes[o + 3] * 0x1000000 : bytes[o] * 0x1000000 + ((bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]));
  const ascii = (o: number, n: number) => { let s = ''; for (let i = 0; i < n && o + i < bytes.length; i++) { const c = bytes[o + i]; if (!c) break; s += String.fromCharCode(c); } return s.trim(); };
  const rational = (o: number) => { const d = u32(o + 4); return d ? u32(o) / d : 0; };
  const readIfd = (off: number): Map<number, { type: number; count: number; valOff: number }> => { const m = new Map<number, { type: number; count: number; valOff: number }>(); const base = tiff + off; if (base + 2 > bytes.length) return m; const n = u16(base); for (let i = 0; i < n; i++) { const e = base + 2 + i * 12; if (e + 12 > bytes.length) break; m.set(u16(e), { type: u16(e + 2), count: u32(e + 4), valOff: e + 8 }); } return m; };
  const str = (ifd: Map<number, { type: number; count: number; valOff: number }>, tag: number) => { const t = ifd.get(tag); if (!t || t.type !== 2) return undefined; const o = t.count > 4 ? tiff + u32(t.valOff) : t.valOff; return ascii(o, t.count) || undefined; };
  const coord = (ifd: Map<number, { type: number; count: number; valOff: number }>, tag: number, refTag: number) => { const t = ifd.get(tag); if (!t || t.type !== 5 || t.count < 3) return undefined; const o = tiff + u32(t.valOff); const v = rational(o) + rational(o + 8) / 60 + rational(o + 16) / 3600; const ref = str(ifd, refTag) ?? ''; return Number.isFinite(v) ? (/[SW]/i.test(ref) ? -v : v) : undefined; };
  const ifd0 = readIfd(u32(tiff + 4)); out.make = str(ifd0, 0x010f); out.model = str(ifd0, 0x0110); out.software = str(ifd0, 0x0131); out.dateTime = str(ifd0, 0x0132);
  const exifPtr = ifd0.get(0x8769); if (exifPtr) { const ex = readIfd(u32(exifPtr.valOff)); out.dateTimeOriginal = str(ex, 0x9003); }
  const gpsPtr = ifd0.get(0x8825); if (gpsPtr) { const g = readIfd(u32(gpsPtr.valOff)); out.lat = coord(g, 0x0002, 0x0001); out.lon = coord(g, 0x0004, 0x0003); }
  return out;
}
export function reverseSearchLinks(imageUrl: string): { name: string; url: string }[] { const u = encodeURIComponent(imageUrl); return [{ name: 'Google Lens', url: `https://lens.google.com/uploadbyurl?url=${u}` }, { name: 'TinEye', url: `https://tineye.com/search?url=${u}` }, { name: 'Yandex', url: `https://yandex.com/images/search?rpt=imageview&url=${u}` }, { name: 'Bing', url: `https://www.bing.com/images/search?q=imgurl:${u}&view=detailv2&iss=sbi` }]; }
/** Parole dell'interfaccia che una città chiama a modo suo (rioni, contrade, sestieri…). */
export const UI_WORDS: { key: string; label: string; fallback: string }[] = [{ key: 'zone', label: 'Zone / quartieri', fallback: 'Zone' }, { key: 'eventi', label: 'Eventi', fallback: 'Cosa fare in città' }, { key: 'segnalazioni', label: 'Segnalazioni', fallback: 'Segnalazioni' }, { key: 'notizie', label: 'Notizie', fallback: 'Notizie' }, { key: 'tag', label: 'Argomenti', fallback: 'Argomenti' }, { key: 'quartiere', label: 'Il mio quartiere', fallback: 'Il mio quartiere' }];
export const uiWord = (words: Record<string, string> | undefined, key: string, fallback?: string): string => words?.[key]?.trim() || fallback || UI_WORDS.find((w) => w.key === key)?.fallback || key;
/** Budget di byte: pagine oltre il tetto. */
export function byteReport(pages: { path: string; bytes: number }[], budgetKb: number): { over: { path: string; bytes: number; pct: number }[]; total: number; worst: { path: string; bytes: number } | null } { const over = pages.filter((p) => p.bytes > budgetKb * 1024).map((p) => ({ ...p, pct: Math.round((100 * p.bytes) / (budgetKb * 1024)) })).sort((a, b) => b.bytes - a.bytes); const worst = pages.length ? pages.reduce((m, p) => (p.bytes > m.bytes ? p : m)) : null; return { over, total: pages.reduce((s, p) => s + p.bytes, 0), worst }; }
/** La pagina da un kilobyte: titoli e link, tagliati finché stanno in 1024 byte. */
export function oneKb(site: string, items: { title: string; url: string }[], limit = 1024): string {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)); const head = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width"><title>${esc(site)}</title><h1>${esc(site)}</h1>`; const size = (s: string) => new TextEncoder().encode(s).length;
  let n = items.length; let cut = 80;
  for (;;) { const body = items.slice(0, n).map((i) => `<p><a href="${i.url}">${esc(i.title.length > cut ? i.title.slice(0, cut - 1) + '…' : i.title)}</a>`).join(''); const html = head + body; if (size(html) <= limit || n === 0) return html; if (cut > 40) cut -= 10; else n--; }
}
/** Manuale generato dal codice: pagine della redazione, cosa possono mandare i lettori, le schede, le pagine pubbliche. */
export function buildManual(x: { siteName: string; nav: { href: string; label: string; group: string; perm?: string }[]; kinds: { kind: string; title: string; fields: { label: string; required?: boolean }[]; perHour: number }[]; cards: { kind: string; name: string; hint: string; group: string }[]; pages: { path: string; title: string }[] }): string {
  const L: string[] = [`# Manuale di ${x.siteName}`, '', `Generato automaticamente dal codice il ${new Date().toLocaleDateString('it-IT')}: se una funzione esiste, è qui; se è qui, esiste.`, '', '## La redazione (pannello /admin)'];
  for (const g of [...new Set(x.nav.map((n) => n.group))]) { L.push('', `### ${g}`); for (const n of x.nav.filter((n) => n.group === g)) L.push(`- **${n.label}** — \`${n.href}\`${n.perm ? ` (permesso: ${n.perm})` : ''}`); }
  L.push('', '## Cosa possono mandare i lettori'); for (const k of x.kinds) L.push(`- **${k.title}** (\`${k.kind}\`): campi ${k.fields.map((f) => f.label + (f.required ? '*' : '')).join(', ')}; al massimo ${k.perHour} all'ora per persona.`);
  L.push('', '## Le schede del territorio'); for (const g of [...new Set(x.cards.map((c) => c.group))]) { L.push('', `### ${g}`); for (const c of x.cards.filter((c) => c.group === g)) L.push(`- **${c.name}** (\`/schede/${c.kind}\`): ${c.hint}`); }
  L.push('', '## Le pagine pubbliche'); for (const p of x.pages) L.push(`- ${p.title} — \`${p.path}\``);
  return L.join('\n');
}
