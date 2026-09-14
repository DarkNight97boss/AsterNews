import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter, Oswald, Playfair_Display, Source_Serif_4 } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { getSettings } from '@/lib/queries';
import { getActiveTheme } from '@/lib/theme-server';
import { themeCss } from '@/lib/themes';
import './globals.scss';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600', '700', '900'], variable: '--font-serif-src', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-playfair', display: 'swap', preload: false });
const oswald = Oswald({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-oswald', display: 'swap', preload: false });

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const s = getSettings();
  return {
    title: { default: `${s.siteName} - ${s.tagline}`, template: `%s | ${s.siteName}` },
    description: s.description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    openGraph: { siteName: s.siteName, locale: 'it_IT', type: 'website' },
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const [{ theme }, cookieStore] = await Promise.all([getActiveTheme(), cookies()]);
  const mode = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang="it" data-theme={mode} data-site-theme={theme.presetId} data-card-style={theme.cardStyle} data-header={theme.headerStyle} className={`${inter.variable} ${serif.variable} ${playfair.variable} ${oswald.variable}`}>
      <body>
        <style dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
