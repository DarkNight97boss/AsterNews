import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories, getSettings, getZones } from '@/lib/queries';
import { getWeather, weatherIcon } from '@/lib/weather';
import { siteUrl } from '@/lib/site-url';
import { ScreenRotator } from '@/components/site/screen-rotator';
import './schermo.scss';

export const metadata: Metadata = { title: 'Schermo pubblico', robots: { index: false } };
export const dynamic = 'force-dynamic';
/** Schermi pubblici: una pagina da lasciare aperta sul televisore del bar o della sala d'attesa. `?zona=slug` per un quartiere. Si aggiorna da sola. */
export default async function ScreenPage({ searchParams }: PageProps<'/schermo'>) {
  const zoneSlug = String((await searchParams).zona ?? ''); const [s, cats, zones] = await Promise.all([getSettings(), getCategories(), getZones()]); const zone = zones.find((z) => z.slug === zoneSlug);
  const [arts, weather] = await Promise.all([listArticles({ status: 'published', ...(zone ? { zoneId: zone.id } : {}) }, 'published', 14), getWeather(s.weatherCity, s.weatherLat, s.weatherLon).catch(() => null)]); const base = siteUrl();
  const slides = await Promise.all(arts.filter((a) => !a.extra?.circle).slice(0, 10).map(async (a) => ({ id: a.id, kicker: a.breaking ? 'Ultim\'ora' : cats.find((c) => c.id === a.categoryId)?.name ?? '', title: a.title, sub: a.subtitle || a.excerpt, image: a.coverImage, breaking: !!a.breaking, qr: await QRCode.toDataURL(base + articleUrlWith(a, cats), { margin: 1, width: 240 }) })));
  return <ScreenRotator siteName={s.siteName} place={zone?.name ?? s.weatherCity ?? ''} slides={slides} weather={weather ? `${weatherIcon(weather.current.code)} ${Math.round(weather.current.temp)}°` : ''} />;
}
