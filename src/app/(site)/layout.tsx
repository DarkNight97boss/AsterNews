import { SiteHeader } from '@/components/site/header';
import { Ticker } from '@/components/site/ticker';
import { Footer } from '@/components/site/footer';
import { getCurrentUser } from '@/lib/auth';
import { articleUrl, getCategories, getLiveArticles, getSettings } from '@/lib/queries';

export default async function SiteLayout({ children }: LayoutProps<'/'>) {
  const user = await getCurrentUser();
  const categories = getCategories();
  const live = getLiveArticles()[0];
  const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <>
      <SiteHeader categories={categories} menuCategories={categories.filter((c) => c.showInMenu)} liveLink={live ? articleUrl(live) : null} isLoggedIn={!!user} today={today} socials={getSettings().socials} />
      <Ticker />
      <main className="page"><div className="container">{children}</div></main>
      <Footer />
    </>
  );
}
