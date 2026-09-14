import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/login', '/cerca'] }], sitemap: [`${base}/sitemap.xml`, `${base}/news-sitemap.xml`] };
}
