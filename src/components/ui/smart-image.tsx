import Image from 'next/image';
import { type ImageSlot, sizesFor } from '@/lib/image-slots';

interface Props { src: string; alt: string; slot?: ImageSlot; sizes?: string; priority?: boolean; className?: string; quality?: number }

/**
 * next/image per URL remoti e per i file della Libreria media.
 * `slot` sceglie automaticamente `sizes` (vedi image-slots.ts); `sizes` esplicito ha la precedenza.
 * Le immagini prioritarie (LCP) vengono precaricate con fetchpriority=high; le altre sono lazy e
 * usano `sizes="auto"` così il browser scarica solo la larghezza che serve davvero.
 */
export function SmartImage({ src, alt, slot = 'card', sizes, priority, className, quality }: Props) {
  if (!src) return null;
  const unoptimized = src.startsWith('data:') || src.startsWith('blob:');
  return <Image src={src} alt={alt} fill sizes={sizes ?? sizesFor(slot, !!priority)} priority={priority} fetchPriority={priority ? 'high' : undefined} quality={quality ?? (priority ? 65 : 75)} unoptimized={unoptimized} className={className} style={{ objectFit: 'cover' }} />;
}
