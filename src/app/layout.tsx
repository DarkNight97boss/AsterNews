import type { Metadata } from 'next';
import { Inter, Roboto_Condensed } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { getSettings } from '@/lib/queries';
import './globals.scss';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-inter', display: 'swap' });
const robotoCond = Roboto_Condensed({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-roboto-cond', display: 'swap' });

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

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it" className={`${inter.variable} ${robotoCond.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
