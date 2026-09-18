import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter, Oswald, Playfair_Display, Roboto_Slab, Source_Serif_4 } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { getSeoSettings, getSettings } from '@/lib/queries';
import { getActiveTheme } from '@/lib/theme-server';
import { themeCss } from '@/lib/themes';
import './globals.scss';
import { siteUrl } from '@/lib/site-url';
import { DEFAULT_ADS } from '@/lib/models';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-inter', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-serif-src', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-playfair', display: 'swap', preload: false });
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-oswald', display: 'swap', preload: false });
const slab = Roboto_Slab({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-slab', display: 'swap', preload: false });

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const [s, seo] = await Promise.all([getSettings(), getSeoSettings()]);
  return {
    title: { default: `${s.siteName} - ${s.tagline}`, template: `%s | ${s.siteName}` },
    description: s.description,
    metadataBase: new URL(siteUrl()),
    openGraph: { siteName: s.siteName, locale: 'it_IT', type: 'website' },
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
    verification: seo.searchConsoleToken ? { google: seo.searchConsoleToken } : undefined,
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const consentAll = ((await (await import('next/headers')).cookies()).get('cookie_consent')?.value ?? '').startsWith('all');
  const [{ theme }, cookieStore, settings] = await Promise.all([getActiveTheme(), cookies(), getSettings()]);
  const ads = { ...DEFAULT_ADS, ...(settings.ads ?? {}) };
  const mode = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang="it" data-theme={mode} data-site-theme={theme.presetId} data-card-style={theme.cardStyle} data-header={theme.headerStyle} data-skin={theme.skin} className={`${inter.variable} ${serif.variable} ${playfair.variable} ${oswald.variable} ${slab.variable}`}>
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
        {settings.theme?.customCss && <style id="aster-custom-css" dangerouslySetInnerHTML={{ __html: settings.theme.customCss }} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([{ '@context': 'https://schema.org', '@type': 'NewsMediaOrganization', name: settings.siteName, url: siteUrl(), logo: { '@type': 'ImageObject', url: `${siteUrl()}/icon.png` }, sameAs: Object.values(settings.socials).filter(Boolean) }, { '@context': 'https://schema.org', '@type': 'WebSite', name: settings.siteName, url: siteUrl(), potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl()}/cerca?q={search_term_string}` }, 'query-input': 'required name=search_term_string' } }]) }} />
        {ads.enabled && ads.adsenseClient && consentAll && <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.adsenseClient}`} crossOrigin="anonymous" />}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
