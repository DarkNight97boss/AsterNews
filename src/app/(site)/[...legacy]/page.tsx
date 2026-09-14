import { notFound, permanentRedirect } from 'next/navigation';
import { legacyRedirectFor } from '@/lib/queries';

/** Vecchi URL (es. WordPress /2024/05/12/slug/) → redirect permanente all'articolo importato. */
export default async function LegacyPage({ params }: PageProps<'/[...legacy]'>) {
  const { legacy } = await params;
  const target = legacyRedirectFor(legacy.join('/'));
  if (target) permanentRedirect(target);
  notFound();
}
