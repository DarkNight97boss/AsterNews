import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArticleCard } from '@/components/site/article-card';
import { PrefsForm } from '@/components/site/prefs-form';
import { getCurrentReader } from '@/lib/auth';
import { getCategories, getTags, getZones } from '@/lib/queries';
import { articlesForPrefs } from '@/lib/repo-extra3';

export const metadata: Metadata = { title: 'Per te', robots: { index: false } };
export default async function ForYouPage() {
  const reader = await getCurrentReader(); if (!reader) redirect('/account?redirect=/account/per-te');
  const prefs = { zones: [], tags: [], categories: [], ...(reader.prefs ?? {}) };
  const [zones, cats, tags, list] = await Promise.all([getZones(), getCategories(), getTags(), articlesForPrefs(prefs, 24)]);
  return (
    <>
      <div className="page-head"><span className="kicker">Il mio account</span><h1>Per te</h1><p>Le notizie delle zone e degli argomenti che segui. <Link href="/account/salvati">Salvati</Link> · <Link href="/account">Account</Link></p></div>
      <div className="layout-sidebar">
        <div>{list.length ? <div className="grid grid-2">{list.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal-sm" showMeta />)}</div> : <p className="help" style={{ fontSize: 15 }}>Scegli almeno una zona, una categoria o un argomento per vedere qui le notizie che ti interessano.</p>}</div>
        <aside className="sidebar"><PrefsForm prefs={prefs} zones={zones.map((z) => ({ id: z.id, name: z.name }))} categories={cats.map((c) => ({ id: c.id, name: c.name }))} tags={tags.slice(0, 60).map((t) => ({ id: t.id, name: t.name }))} /></aside>
      </div>
    </>
  );
}
