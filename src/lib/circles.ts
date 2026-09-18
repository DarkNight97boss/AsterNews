/** Cerchie di lettori: parti di un post (o post interi) visibili solo a gruppi scelti, come «Famiglia» o «Amici». Funzioni pure. */
export interface Circle { id: string; name: string }
export type Viewer = { staff: boolean; circles: string[] };
const BLOCK = /<div[^>]*class="circle-only"[^>]*data-circle="([^"]+)"[^>]*>([\s\S]*?)<\/div>/g;
/** Toglie dal testo i blocchi riservati che chi guarda non può vedere, lasciando un segnaposto discreto. Lo staff vede tutto, con un'etichetta. */
export function filterCircles(html: string, viewer: Viewer, circles: Circle[]): string {
  if (!html.includes('circle-only')) return html;
  return html.replace(BLOCK, (_m, id: string, inner: string) => { const name = circles.find((c) => c.id === id)?.name ?? 'una cerchia';
    if (viewer.staff) return `<div class="circle-only visible" data-circle="${id}"><span class="circle-tag">🔒 Solo per «${name}»</span>${inner}</div>`;
    if (viewer.circles.includes(id)) return `<div class="circle-only visible" data-circle="${id}"><span class="circle-tag">Per «${name}»</span>${inner}</div>`;
    return `<p class="circle-locked">🔒 Una parte di questo testo è riservata a «${name}».</p>`; });
}
export const canSeeArticle = (circleId: string | undefined, viewer: Viewer): boolean => !circleId || viewer.staff || viewer.circles.includes(circleId);
/** Per feed, API, ricerca e anteprime: i blocchi riservati non devono mai uscire. */
export const stripCircles = (html: string): string => html.replace(BLOCK, '');
