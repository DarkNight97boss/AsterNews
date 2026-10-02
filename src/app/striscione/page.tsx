import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { getPublished, getSettings, getCategories, articleUrlWith } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';
import { ScreenRotator } from '@/components/site/screen-rotator';
import '../schermo/schermo.scss';

export const metadata: Metadata = { title: 'Striscione', robots: { index: false } };
export const dynamic = 'force-dynamic';
/** Striscione: uno schermo verticale (vetrina, piazza) con il titolo del giorno, grande, e il codice per leggerlo. */
export default async function BannerScreenPage() { const [s, arts, cats] = await Promise.all([getSettings(), getPublished(3), getCategories()]); const slides = await Promise.all(arts.map(async (a) => ({ id: a.id, kicker: a.breaking ? 'Ultim\'ora' : 'Oggi', title: a.title, sub: '', image: a.coverImage, breaking: !!a.breaking, qr: await QRCode.toDataURL(siteUrl() + articleUrlWith(a, cats), { margin: 1, width: 240 }) }))); return <div className="screen-vertical"><ScreenRotator siteName={s.siteName} place="" slides={slides} weather="" /></div>; }
