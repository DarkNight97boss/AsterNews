import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import { Sidebar } from '@/components/site/sidebar';
import { SmartImage } from '@/components/ui/smart-image';
import { Article } from '@/lib/models';
import { articleUrl, articlesByCategory, category, getFeatured, getPublished, getSettings } from '@/lib/queries';

function shortTime(a: Article): string {
  const d = new Date(a.publishedAt ?? '');
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export default function HomePage() {
  const featured = getFeatured();
  const published = getPublished();
  const hero = [...featured, ...published.filter((a) => !featured.includes(a))].slice(0, 3);
  const heroIds = new Set(hero.map((a) => a.id));
  const latest = published.filter((a) => !heroIds.has(a.id)).slice(0, 8);
  const sections = getSettings().homeSections
    .map((id) => category(id))
    .filter((c): c is NonNullable<typeof c> => !!c && c.showOnHome)
    .map((c) => ({ category: c, articles: articlesByCategory(c.id).slice(0, 5) }))
    .filter((s) => s.articles.length > 0);
  const videos = published.filter((a) => a.format === 'video').slice(0, 3);

  return (
    <>
      {hero.length > 0 && (
        <section className="hero">
          <ArticleCard article={hero[0]} variant="hero-overlay" showExcerpt priority />
          <div className="hero-side">{hero.slice(1, 3).map((a) => <ArticleCard key={a.id} article={a} variant="md" />)}</div>
        </section>
      )}
      <div className="layout-sidebar">
        <div>
          <section className="section">
            <div className="section-title"><h2>Ultime notizie</h2><Link href="/notizie">Tutte le notizie →</Link></div>
            <div className="grid grid-4">
              {latest.map((a) => (
                <article key={a.id} className="card card-sm">
                  <Link className="card-img" href={articleUrl(a)}><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 50vw, 300px" /></Link>
                  <div className="card-body">
                    <div className="meta"><span className="badge badge-red" style={{ fontSize: 10 }}>{shortTime(a)}</span> <b>{category(a.categoryId)?.name}</b></div>
                    <h3 className="card-title" style={{ marginTop: 6 }}><Link href={articleUrl(a)}>{a.title}</Link></h3>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {sections.map((sec) => (
            <section key={sec.category.id} className="section" style={{ ['--section-color' as string]: sec.category.color }}>
              <div className="section-title"><h2>{sec.category.name}</h2><Link href={`/${sec.category.slug}`}>Tutto {sec.category.name} →</Link></div>
              <div className="section-mixed">
                <ArticleCard article={sec.articles[0]} variant="hero" showExcerpt />
                <div className="list">{sec.articles.slice(1, 5).map((a) => <ArticleCard key={a.id} article={a} variant="compact" showMeta={false} />)}</div>
              </div>
            </section>
          ))}

          {videos.length > 0 && (
            <section className="section" style={{ ['--section-color' as string]: '#111' }}>
              <div className="section-title"><h2>Video</h2></div>
              <div className="grid grid-3">{videos.map((a) => <ArticleCard key={a.id} article={a} variant="sm" />)}</div>
            </section>
          )}
        </div>
        <Sidebar />
      </div>
    </>
  );
}
