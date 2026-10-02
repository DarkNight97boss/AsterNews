/** Cerchie di lettori: parti di un post (o post interi) visibili solo a gruppi scelti, come «Famiglia» o «Amici». Funzioni pure. */
export interface Circle { id: string; name: string }
export type Viewer = { staff: boolean; circles: string[] };
export const ME = '__me';
const OPEN = /<div[^>]*class="circle-only"[^>]*data-circle="([^"]+)"[^>]*>/g;
/** Sostituisce ogni blocco riservato, trovando il </div> che lo chiude davvero (i blocchi possono contenere altri div: riquadri, strati, timeline). Un blocco mai chiuso arriva fino alla fine del testo. */
export function replaceCircleBlocks(html: string, fn: (id: string, inner: string) => string): string {
  let out = ''; let pos = 0; OPEN.lastIndex = 0; let m: RegExpExecArray | null;
  while ((m = OPEN.exec(html))) { if (m.index < pos) continue; out += html.slice(pos, m.index); const start = m.index + m[0].length; const tag = /<div\b|<\/div\s*>/gi; tag.lastIndex = start; let depth = 1; let close = -1; let end = html.length; let t: RegExpExecArray | null;
    while ((t = tag.exec(html))) { depth += t[0].startsWith('</') ? -1 : 1; if (depth === 0) { close = t.index; end = t.index + t[0].length; break; } }
    out += fn(m[1], html.slice(start, close === -1 ? html.length : close)); pos = end; OPEN.lastIndex = end; }
  return out + html.slice(pos);
}
/** Toglie dal testo i blocchi riservati che chi guarda non può vedere, lasciando un segnaposto discreto. Lo staff vede tutto, con un'etichetta. */
export function filterCircles(html: string, viewer: Viewer, circles: Circle[]): string {
  if (!html.includes('circle-only')) return html;
  return replaceCircleBlocks(html, (id, inner) => {
    // Diario privato: i passaggi «solo io» li vede soltanto chi scrive, e per gli altri non lasciano traccia
    if (id === ME) return viewer.staff ? `<div class="circle-only visible private" data-circle="${ME}"><span class="circle-tag">🔐 Solo per te: i lettori non vedono questo passaggio</span>${inner}</div>` : '';
    const name = circles.find((c) => c.id === id)?.name ?? 'una cerchia';
    if (viewer.staff) return `<div class="circle-only visible" data-circle="${id}"><span class="circle-tag">🔒 Solo per «${name}»</span>${inner}</div>`;
    if (viewer.circles.includes(id)) return `<div class="circle-only visible" data-circle="${id}"><span class="circle-tag">Per «${name}»</span>${inner}</div>`;
    return `<p class="circle-locked">🔒 Una parte di questo testo è riservata a «${name}».</p>`; });
}
export const canSeeArticle = (circleId: string | undefined, viewer: Viewer): boolean => !circleId || viewer.staff || viewer.circles.includes(circleId);
/** Per feed, API, ricerca e anteprime: i blocchi riservati non devono mai uscire. */
export const stripCircles = (html: string): string => (html.includes('circle-only') ? replaceCircleBlocks(html, () => '') : html);
