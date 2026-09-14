import Link from 'next/link';
import { ArticleCard, Kicker } from '@/components/site/article-card';
import { FromCities, MostRead, NewsletterWidget } from '@/components/site/widgets';
import { SmartImage } from '@/components/ui/smart-image';
import { articleUrl, articlesByCategory, category, getCategories, getFeatured, getPublished, getSettings, user } from '@/lib/queries';

export default function HomePage() {
  const cats = getCategories();
  const published = getPublished();
  const featured = getFeatured();
  const dossierCat = cats.find((c) => c.kind === 'dossier');
  const opinionCat = cats.find((c) => c.kind === 'opinion');
  const localCat = cats.find((c) => c.kind === 'local');
  const isNews = (id: string) => ![dossierCat?.id, opinionCat?.id, localCat?.id].includes(id);

  const newsPool = [...featured.filter((a) => isNews(a.categoryId)), ...published.filter((a) => isNews(a.categoryId) && !featured.includes(a))];
  const lead = newsPool[0];
  const pair = newsPool.slice(1, 3);
  const used = new Set([lead?.id, ...pair.map((a) => a.id)]);

  const dossiers = dossierCat ? articlesByCategory(dossierCat.id) : [];
  const dossierLead = dossiers.find((a) => a.featured) ?? dossiers[0];
  const dossierRest = dossiers.filter((a) => a.id !== dossierLead?.id).slice(0, 3);
  const opinions = opinionCat ? articlesByCategory(opinionCat.id).slice(0, 3) : [];
  const videos = published.filter((a) => a.format === 'video').slice(0, 3);

  const sections = getSettings().homeSections
    .map((id) => category(id))
    .filter((c): c is NonNullable<typeof c> => !!c && c.showOnHome)
    .map((c) => ({ category: c, articles: articlesByCategory(c.id).filter((a) => !used.has(a.id)).slice(0, 4) }))
    .filter((s) => s.articles.length > 0);

  return (
    <>
      <div className="home-top">
        <div className="home-main">
          {lead && (
            <section className="hero-lead">
              <div className="card card-hero">
                <div className="card-body">
                  <Kicker article={lead} />
                  <h2 className="card-title"><Link href={articleUrl(lead)}>{lead.title}</Link></h2>
                  <p className="card-excerpt">{lead.excerpt}</p>
                </div>
              </div>
              <Link className="card-img" href={articleUrl(lead)} style={{ position: 'relative', display: 'block', aspectRatio: '3 / 2', overflow: 'hidden' }}><SmartImage src={lead.coverImage} alt={lead.title} priority sizes="(max-width: 768px) 100vw, 480px" /></Link>
            </section>
          )}
          <div className="hero-pair">{pair.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" />)}</div>
        </div>
        <aside className="home-side"><FromCities n={5} /></aside>
      </div>

      {dossierLead && (
        <section className="band">
          <div className="container">
            <div className="band-inner">
              <div>
                <Kicker article={dossierLead} />
                <h2 className="band-title" style={{ marginTop: 10 }}><Link href={articleUrl(dossierLead)}>{dossierLead.title}</Link></h2>
                <div className="band-by">di {user(dossierLead.authorId)?.name}</div>
                <p className="band-excerpt">{dossierLead.excerpt}</p>
              </div>
              <Link href={articleUrl(dossierLead)} className="band-img"><SmartImage src={dossierLead.coverImage} alt={dossierLead.title} sizes="(max-width: 768px) 100vw, 480px" /></Link>
            </div>
          </div>
        </section>
      )}

      {dossierCat && dossierRest.length > 0 && (
        <section className="section band-dark" style={{ padding: '32px 0', marginBottom: 48 }}>
          <div className="container">
            <div className="section-title section-title-stencil"><h2>{dossierCat.name}</h2><Link href={`/${dossierCat.slug}`}>Vai alla sezione →</Link></div>
            <div className="grid grid-3 grid-divided">{dossierRest.map((a) => <ArticleCard key={a.id} article={a} variant="md" showExcerpt />)}</div>
          </div>
        </section>
      )}

      {sections.map((sec) => (
        <section key={sec.category.id} className="section">
          <div className="section-title"><h2>{sec.category.name}</h2><Link href={`/${sec.category.slug}`}>Vai alla sezione →</Link></div>
          <div className="grid grid-4 grid-divided">{sec.articles.map((a) => <ArticleCard key={a.id} article={a} variant="sm" />)}</div>
        </section>
      ))}

      {opinionCat && opinions.length > 0 && (
        <section className="section">
          <div className="section-title"><h2>{opinionCat.name}</h2><Link href={`/${opinionCat.slug}`}>Tutte le firme →</Link></div>
          <div className="opinions-row grid-divided">{opinions.map((a) => <ArticleCard key={a.id} article={a} variant="opinion" showExcerpt />)}</div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="section">
          <div className="section-title"><h2>Video</h2></div>
          <div className="grid grid-3 grid-divided">{videos.map((a) => <ArticleCard key={a.id} article={a} variant="sm" />)}</div>
        </section>
      )}

      <div className="layout-sidebar" style={{ alignItems: 'start' }}>
        <MostRead n={8} />
        <NewsletterWidget />
      </div>
    </>
  );
}
