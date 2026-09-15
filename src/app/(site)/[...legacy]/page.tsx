import { headers } from 'next/headers';
import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { legacyRedirectFor } from '@/lib/queries';
import { findRedirect, logNotFound } from '@/lib/repo-extra';

/** Vecchi URL: prima i redirect manuali, poi quelli WordPress importati; se non c'è nulla registra il 404 per la redazione. */
export default async function LegacyPage({ params }: PageProps<'/[...legacy]'>) {
  const { legacy } = await params;
  const path = '/' + legacy.map(decodeURIComponent).join('/');
  const manual = await findRedirect(path);
  if (manual) { if (manual.code === 302) redirect(manual.toPath); permanentRedirect(manual.toPath); }
  const target = await legacyRedirectFor(legacy.join('/'));
  if (target) permanentRedirect(target);
  if (!/\.(png|jpe?g|gif|webp|svg|ico|css|js|map|txt|xml|woff2?|ttf)$/i.test(path) && !path.startsWith('/wp-') && !path.startsWith('/.well-known')) {
    const h = await headers(); await logNotFound(path, h.get('referer') ?? '').catch(() => {});
  }
  notFound();
}
