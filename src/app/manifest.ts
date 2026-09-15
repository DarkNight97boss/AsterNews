import type { MetadataRoute } from 'next';
import { getSettings, getTheme } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [s, t] = await Promise.all([getSettings(), getTheme()]);
  return {
    name: s.siteName, short_name: s.siteName.slice(0, 12), description: s.description, start_url: '/?utm_source=pwa', display: 'standalone', lang: 'it',
    background_color: '#ffffff', theme_color: t.brand,
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  };
}
