/** Formati e dispositivi: Braille BRF, notifiche da orologio, album mensile, copione della radio. Solo funzioni pure. */
// Braille italiano integrale (grado 1) in codice ASCII-Braille per file .brf: lettere, cifre col segno di numero, accentate, punteggiatura essenziale.
const LETTERS: Record<string, string> = { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x', y: 'y', z: 'z', 'à': '(', 'è': '!', 'é': '=', 'ì': '/', 'ò': '+', 'ù': ')', ' ': ' ', ',': '1', '.': '4', ';': '2', ':': '3', '?': '8', '!': '6', '(': '7', ')': '7', "'": "'", '’': "'", '-': '-', '–': '-', '—': '-', '"': '0', '«': '0', '»': '0', '/': '_/' };
const DIGITS = 'jabcdefghi';
export function toBrf(text: string, cols = 40, rows = 25): string {
  const words = text.normalize('NFC').replace(/\s+/g, ' ').trim().split(' '); const cells: string[] = []; let inNumber = false;
  const enc = (w: string): string => { let out = ''; inNumber = false; for (const ch of w) { if (/\d/.test(ch)) { if (!inNumber) { out += '#'; inNumber = true; } out += DIGITS[Number(ch)]; continue; } inNumber = false; const low = ch.toLowerCase(); if (ch !== low && LETTERS[low]) out += '.'; out += LETTERS[low] ?? (/[a-z]/i.test(low) ? low : ''); } return out; };
  for (const w of words) cells.push(enc(w));
  const lines: string[] = []; let cur = ''; for (const c of cells) { if (!c) continue; if (cur && cur.length + 1 + c.length > cols) { lines.push(cur); cur = c.length > cols ? c.slice(0, cols) : c; } else cur = cur ? `${cur} ${c}` : c; } if (cur) lines.push(cur);
  const pages: string[] = []; for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows).join('\r\n')); return pages.join('\r\n\f') + '\r\n';
}
/** Notifica per l'orologio: il fatto in dodici parole. */
export const shortPush = (body: string, words = 12): string => { const w = body.replace(/\s+/g, ' ').trim().split(' '); return w.length <= words ? body.trim() : w.slice(0, words).join(' ').replace(/[,;:]$/, '') + '…'; };
export const WATCH_TOPIC = 'watch';
/** Album del mese: le immagini degli articoli di un mese, senza doppioni. */
export function monthAlbum<T extends { publishedAt: string | null; coverImage: string; coverCaption: string; gallery: (string | { url: string; caption?: string })[]; title: string }>(arts: T[], month: string): { url: string; caption: string; title: string; date: string }[] {
  const seen = new Set<string>(); const out: { url: string; caption: string; title: string; date: string }[] = [];
  for (const a of arts.filter((x) => (x.publishedAt ?? '').startsWith(month)).sort((x, y) => (x.publishedAt ?? '').localeCompare(y.publishedAt ?? ''))) { for (const img of [{ url: a.coverImage, caption: a.coverCaption }, ...(a.gallery ?? []).map((g) => (typeof g === 'string' ? { url: g, caption: '' } : { url: g.url, caption: g.caption ?? '' }))]) { if (!img.url || seen.has(img.url)) continue; seen.add(img.url); out.push({ url: img.url, caption: img.caption || a.title, title: a.title, date: a.publishedAt!.slice(0, 10) }); } }
  return out.slice(0, 60);
}
/** Copione della radio del mattino: cinque minuti circa (750 parole) di titoli e sommari. */
export function radioScript(siteName: string, date: string, items: { title: string; excerpt: string }[], maxWords = 750): string {
  let out = `Buongiorno, è ${date}. Questo è il notiziario di ${siteName}.`; for (const it of items) { const piece = ` ${it.title}. ${it.excerpt}`; if ((out + piece).split(' ').length > maxWords) break; out += piece; } return out + ` È tutto per oggi: le notizie complete sono su ${siteName}. Buona giornata.`;
}
