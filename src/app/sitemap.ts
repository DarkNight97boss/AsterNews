import type { MetadataRoute } from 'next';
import { articleUrl, getCategories, getEvents, getPublished, getTags, getZones } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return [
    { url: base, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/notizie`, changeFrequency: 'hourly', priority: 0.8 },
    ...getCategories().map((c) => ({ url: `${base}/${c.slug}`, changeFrequency: 'hourly' as const, priority: 0.8 })),
    ...getPublished().filter((a) => !a.seo.noIndex).map((a) => ({ url: `${base}${articleUrl(a)}`, lastModified: a.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...['/eventi', '/zone', '/meteo', '/segnalazioni', '/video', '/foto'].map((p) => ({ url: `${base}${p}`, changeFrequency: 'daily' as const, priority: 0.6 })),
    ...getEvents().map((e) => ({ url: `${base}/eventi/${e.slug}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    ...getZones().map((z) => ({ url: `${base}/zone/${z.slug}`, changeFrequency: 'daily' as const, priority: 0.5 })),
    ...getTags().map((t) => ({ url: `${base}/tag/${t.slug}`, changeFrequency: 'weekly' as const, priority: 0.4 })),
  ];
}
