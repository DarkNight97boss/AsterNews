import { SiteHeader } from '@/components/site/header';
import { Ticker } from '@/components/site/ticker';
import { Footer } from '@/components/site/footer';
import { CookieBanner } from '@/components/site/cookie-banner';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { articleUrl, articlesByCategory, getCategories, getLiveArticles, getPublished, getSettings, getZones, tag, user, zoneCounts } from '@/lib/queries';
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
  const topicsByCategory: Record<string, { name: string; slug: string }[]> = {};
  for (const c of categories) {
    const count = new Map<string, number>();
    articlesByCategory(c.id).forEach((a) => a.tagIds.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    topicsByCategory[c.slug] = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => tag(id)).filter((t): t is NonNullable<typeof t> => !!t).map((t) => ({ name: t.name, slug: t.slug }));
  }
  const pills = topZones.filter((z) => z.kind === 'comune' || (counts[z.id] ?? 0) > 0).slice(0, 2).map((z) => ({ name: z.name, href: `/zone/${z.slug}` }));
  return (
    <div className="site-frame">
      {preview && <PreviewBar themeName={theme.name} />}
      <SiteHeader categories={categories} zones={topZones} opinions={opinions} weather={weather ? { icon: weatherIcon(weather.current.code), label: weatherLabel(weather.current.code), temp: weather.current.temp, city: weather.city } : null} liveLink={live ? articleUrl(live) : null} isLoggedIn={!!me} today={today} subscribeUrl={s.subscribeUrl} siteName={s.siteName} tagline={s.tagline} socials={s.socials} headerStyle={theme.headerStyle} topicsByCategory={topicsByCategory} pills={pills} />
      <Ticker />
      <main className="page"><div className="container">{children}</div></main>
      <Footer />
      {!cookieStore.get('cookie_consent') && <CookieBanner />}
    </div>
  );
}
