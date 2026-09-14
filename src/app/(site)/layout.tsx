import { SiteHeader } from '@/components/site/header';
import { Ticker } from '@/components/site/ticker';
import { Footer } from '@/components/site/footer';
import { CookieBanner } from '@/components/site/cookie-banner';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { articleUrl, getCategories, getLiveArticles, getPublished, getSettings, getZones, user, zoneCounts } from '@/lib/queries';
import { getWeather, weatherIcon, weatherLabel } from '@/lib/weather';
import { getActiveTheme } from '@/lib/theme-server';
import { PreviewBar } from '@/components/site/preview-bar';

export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  const s = getSettings();
  const [me, weather, cookieStore, { theme, preview }] = await Promise.all([getCurrentUser(), getWeather(s.weatherCity, s.weatherLat, s.weatherLon), cookies(), getActiveTheme()]);
  const categories = getCategories();
  const opinionIds = new Set(categories.filter((c) => c.kind === 'opinion').map((c) => c.id));
  const opinions = getPublished().filter((a) => opinionIds.has(a.categoryId)).slice(0, 2).map((a) => ({ title: a.title, url: articleUrl(a), author: user(a.authorId)?.name ?? '', avatar: user(a.authorId)?.avatar ?? '' }));
  const live = getLiveArticles()[0];
  const counts = zoneCounts();
  const topZones = [...getZones()].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name));
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <>
      {preview && <PreviewBar themeName={theme.name} />}
      <SiteHeader categories={categories} zones={topZones} opinions={opinions} weather={weather ? { icon: weatherIcon(weather.current.code), label: weatherLabel(weather.current.code), temp: weather.current.temp, city: weather.city } : null} liveLink={live ? articleUrl(live) : null} isLoggedIn={!!me} today={today} subscribeUrl={s.subscribeUrl} siteName={s.siteName} tagline={s.tagline} socials={s.socials} headerStyle={theme.headerStyle} />
      <Ticker />
      <main className="page"><div className="container">{children}</div></main>
      <Footer />
      {!cookieStore.get('cookie_consent') && <CookieBanner />}
    </>
  );
}
