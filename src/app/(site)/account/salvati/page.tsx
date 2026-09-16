import { OfflineButton } from '@/components/site/offline-button';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { getCurrentReader } from '@/lib/auth';
import { bookmarkedArticles } from '@/lib/repo-extra3';

export const metadata: Metadata = { title: 'Articoli salvati', robots: { index: false } };
export default async function SavedPage() {
  const reader = await getCurrentReader(); if (!reader) redirect('/account?redirect=/account/salvati');
  const list = await bookmarkedArticles(reader.id);
  const cats = await (await import('@/lib/queries')).getCategories(); const offlineUrls = list.map((a) => `/${cats.find((c) => c.id === a.categoryId)?.slug ?? 'notizie'}/${a.slug}`);
  return <><div className="page-head"><span className="kicker">Il mio account</span><h1>Articoli salvati</h1><OfflineButton urls={offlineUrls} /><p><span className="count">{list.length} articoli</span> · <Link href="/account/per-te">Per te</Link> · <Link href="/account">Account</Link></p></div>{list.length ? <div className="grid grid-3">{list.map((a) => <ArticleCard key={a.id} article={a} variant="sm" showMeta />)}</div> : <p className="help" style={{ fontSize: 15 }}>Nessun articolo salvato: usa «Salva» nella pagina di un articolo per leggerlo dopo.</p>}</>;
}
