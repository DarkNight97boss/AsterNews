/**
 * Slot immagine: ogni posizione del sito dichiara quanto è larga davvero l'immagine ai vari breakpoint.
 * Da qui derivano gli attributi `sizes` (e quindi le varianti scaricate dal browser) senza doverli
 * scrivere a mano in ogni componente. I breakpoint sono quelli di globals.scss: 520px (una colonna),
 * 768px (due colonne), 1024px (colonna laterale nascosta). Il padding del contenitore è 20px per lato.
 */
export type ImageSlot = 'hero' | 'cover' | 'band' | 'card' | 'card-sm' | 'card-horizontal' | 'thumb' | 'overlay' | 'overlay-sm' | 'event' | 'section-cover' | 'gallery' | 'body' | 'full';

const SLOT_SIZES: Record<ImageSlot, string> = {
  hero: '(max-width: 768px) calc(100vw - 40px), 480px',
  cover: '(max-width: 768px) calc(100vw - 40px), 800px',
  band: '(max-width: 768px) calc(100vw - 40px), 480px',
  card: '(max-width: 520px) calc(100vw - 80px), (max-width: 768px) 50vw, 600px',
  'card-sm': '(max-width: 520px) calc(100vw - 40px), (max-width: 768px) 50vw, 300px',
  'card-horizontal': '(max-width: 520px) 40vw, 280px',
  thumb: '130px',
  overlay: '(max-width: 768px) 100vw, 800px',
  'overlay-sm': '(max-width: 520px) calc(100vw - 40px), (max-width: 768px) 50vw, 400px',
  event: '(max-width: 520px) calc(100vw - 40px), (max-width: 768px) 50vw, 400px',
  'section-cover': '100vw',
  gallery: '(max-width: 520px) calc(100vw - 40px), 33vw',
  body: '(max-width: 768px) calc(100vw - 40px), 760px',
  full: '100vw',
};

/**
 * `sizes` per uno slot. Per le immagini non prioritarie (caricate in lazy) antepone `auto`:
 * i browser moderni misurano la larghezza reale dell'elemento e scelgono da soli la variante giusta,
 * gli altri usano l'elenco che segue.
 */
export function sizesFor(slot: ImageSlot, priority = false): string {
  const s = SLOT_SIZES[slot];
  return priority ? s : `auto, ${s}`;
}
export const IMAGE_SLOTS = Object.keys(SLOT_SIZES) as ImageSlot[];
