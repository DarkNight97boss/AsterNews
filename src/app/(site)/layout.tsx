import { SiteHeader } from '@/components/site/header';
import { Ticker } from '@/components/site/ticker';
import { Footer } from '@/components/site/footer';
import { CookieBanner } from '@/components/site/cookie-banner';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { articleUrlWith, getCategories, getLiveArticles, getSettings, getUsers, getZones, listPublished, topTagsForCategory, zoneCounts } from '@/lib/queries';
import { getWeather, weatherIcon, weatherLabel } from '@/lib/weather';
import { getActiveTheme } from '@/lib/theme-server';
import { PreviewBar } from '@/components/site/preview-bar';
import { ensureInstalled } from '@/lib/install';
import { Analytics } from '@/components/site/analytics';
import { PushPrompt } from '@/components/site/push-prompt';
import { DEFAULT_ANALYTICS, DEFAULT_PUSH } from '@/lib/models';
import { currentEdition } from '@/lib/edition';
import { A11yBar } from '@/components/site/a11y-bar';
import { DEFAULT_MENUS } from '@/lib/models';
import { listPages } from '@/lib/repo-extra3';

export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  await ensureInstalled();
  const [s0, edition] = await Promise.all([getSettings(), currentEdition()]);
  const s = edition ? { ...s0, siteName: edition.name, tagline: edition.tagline || s0.tagline } : s0;
  const [me, weather, cookieStore, { theme, preview }, categories, users, zones, counts, live] = await Promise.all([getCurrentUser(), getWeather(s.weatherCity, s.weatherLat, s.weatherLon), cookies(), getActiveTheme(), getCategories(), getUsers(), getZones(), zoneCounts(), getLiveArticles()]);
  if (s.maintenance?.enabled && !me) return <div className="maintenance"><div><div className="logo">{s.siteName}</div><h1>Torniamo subito</h1><p>{s.maintenance.message || 'Stiamo aggiornando il sito: torniamo tra pochi minuti.'}</p></div></div>;
  const menus = { ...DEFAULT_MENUS, ...(s.menus ?? {}) };
  const menuPages = (await listPages(true)).filter((p) => p.showInMenu).map((p) => ({ id: p.id, label: p.title, url: `/${p.slug}` }));
  const opinionCat = categories.find((c) => c.kind === 'opinion');
  const opinionArticles = opinionCat ? await listPublished({ categoryId: opinionCat.id }, 2) : [];
  const opinions = opinionArticles.map((a) => { const u = users.find((x) => x.id === a.authorId); return { title: a.title, url: articleUrlWith(a, categories), author: u?.name ?? '', avatar: u?.avatar ?? '' }; });
  const topZones = [...zones].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name));
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const topicsByCategory: Record<string, { name: string; slug: string }[]> = {};
  await Promise.all(categories.filter((c) => c.showInMenu).map(async (c) => { topicsByCategory[c.slug] = (await topTagsForCategory(c.id, 8)).map((t) => ({ name: t.name, slug: t.slug })); }));
  const pills = topZones.filter((z) => z.kind === 'comune' || (counts[z.id] ?? 0) > 0).slice(0, 2).map((z) => ({ name: z.name, href: `/zone/${z.slug}` }));
  return (
    <div className="site-frame">
      {preview && <PreviewBar themeName={theme.name} />}
      <SiteHeader logoUrl={edition?.logo || ''} customMenu={menus.useCustomHeader && menus.header.length ? menus.header : undefined} extraLinks={menuPages} categories={categories} zones={topZones} opinions={opinions} weather={weather ? { icon: weatherIcon(weather.current.code), label: weatherLabel(weather.current.code), temp: weather.current.temp, city: weather.city } : null} liveLink={live[0] ? articleUrlWith(live[0], categories) : null} isLoggedIn={!!me} today={today} subscribeUrl={s.subscribeUrl} siteName={s.siteName} tagline={s.tagline} socials={s.socials} headerStyle={theme.headerStyle} topicsByCategory={topicsByCategory} pills={pills} />
      <Ticker />
      <A11yBar />
      <main className="page"><div className="container">{children}</div></main>
      <Footer />
      {!(cookieStore.get('cookie_consent')?.value ?? '').endsWith(`:v${s.privacy?.policyVersion ?? 1}`) && <CookieBanner />}
      {{ ...DEFAULT_ANALYTICS, ...(s.analytics ?? {}) }.enabled && <Analytics vercel={!!s.analytics?.vercelAnalytics} />}
      {{ ...DEFAULT_PUSH, ...(s.push ?? {}) }.enabled && <PushPrompt siteName={s.siteName} />}
    </div>
  );
}
