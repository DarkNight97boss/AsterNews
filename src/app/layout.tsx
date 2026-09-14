import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { getSettings } from '@/lib/queries';
import './globals.scss';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], weight: ['400', '600', '700', '900'], variable: '--font-serif-src', display: 'swap' });

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
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : 'light';
  return (
    <html lang="it" data-theme={theme} className={`${inter.variable} ${serif.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
