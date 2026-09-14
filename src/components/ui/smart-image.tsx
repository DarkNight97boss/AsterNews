import Image from 'next/image';

interface Props { src: string; alt: string; sizes?: string; priority?: boolean; className?: string }

/** next/image per URL remoti, non ottimizzato per data URL (upload locali). */
export function SmartImage({ src, alt, sizes = '(max-width: 768px) 100vw, 50vw', priority, className }: Props) {
  if (!src) return null;
  const unoptimized = src.startsWith('data:') || src.startsWith('blob:');
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={unoptimized} className={className} style={{ objectFit: 'cover' }} />;
}
