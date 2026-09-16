import { NextResponse } from 'next/server';
import { articleUrlWith, getCategories, getPublished, getSettings } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';
import { stripHtml } from '@/lib/utils';

export const dynamic = 'force-dynamic';
/** Flash Briefing per Alexa (e lettura vocale su Google tramite feed): le ultime 5 notizie in formato JSON, con audio se c'è l'audio-articolo. */
export async function GET() {
  const [arts, cats, s] = await Promise.all([getPublished(5), getCategories(), getSettings()]); const base = siteUrl();
  const items = arts.map((a) => ({ uid: `urn:uuid:${a.id}`, updateDate: new Date(a.publishedAt ?? a.updatedAt).toISOString().replace(/\.\d{3}Z$/, '.0Z'), titleText: a.title, mainText: (a.excerpt || stripHtml(a.content).slice(0, 400)).slice(0, 4500), redirectionUrl: base + articleUrlWith(a, cats), ...(a.extra?.audioUrl ? { streamUrl: a.extra.audioUrl } : {}) }));
  return NextResponse.json(items, { headers: { 'Cache-Control': 'public, max-age=300', 'X-Site': s.siteName } });
}
