import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter, Oswald, Playfair_Display, Roboto_Slab, Source_Serif_4 } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { getSeoSettings, getSettings } from '@/lib/queries';
import { getActiveTheme } from '@/lib/theme-server';
import { themeCss } from '@/lib/themes';
import './globals.scss';
import { siteUrl } from '@/lib/site-url';

const inter = Inter({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-inter', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-serif-src', display: 'swap', preload: false });
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
  const [{ theme }, cookieStore] = await Promise.all([getActiveTheme(), cookies()]);
  const mode = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang="it" data-theme={mode} data-site-theme={theme.presetId} data-card-style={theme.cardStyle} data-header={theme.headerStyle} data-skin={theme.skin} className={`${inter.variable} ${serif.variable} ${playfair.variable} ${oswald.variable} ${slab.variable}`}>
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
