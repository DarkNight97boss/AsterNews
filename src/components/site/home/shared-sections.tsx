import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import { EventCard } from '@/components/site/event-card';
import { MostRead, NewsletterWidget } from '@/components/site/widgets';
import type { HomeData } from './home-data';

/** Blocchi comuni a tutti i layout: eventi, sezioni per categoria, opinioni, video, più letti + newsletter. */
export function CommonSections({ d, sectionVariant = 'sm', cols = 4 }: { d: HomeData; sectionVariant?: 'sm' | 'md'; cols?: 3 | 4 }) {
  return (
    <>
      {d.events.length > 0 && (
        <section className="section home-events"><div className="section-title"><h2>Cosa fare in città</h2><Link href="/eventi">Tutti gli eventi →</Link></div><div className="events-grid">{d.events.map((e) => <EventCard key={e.id} event={e} />)}</div></section>
      )}
      {d.sections.map((sec) => (
        <section key={sec.category.id} className="section">
          <div className="section-title"><h2>{sec.category.name}</h2><Link href={`/${sec.category.slug}`}>Vai alla sezione →</Link></div>
          <div className={`grid grid-${cols} grid-divided`}>{sec.articles.slice(0, cols).map((a) => <ArticleCard key={a.id} article={a} variant={sectionVariant} showExcerpt={sectionVariant === 'md'} />)}</div>
        </section>
      ))}
      {d.opinionCat && d.opinions.length > 0 && (
        <section className="section"><div className="section-title"><h2>{d.opinionCat.name}</h2><Link href={`/${d.opinionCat.slug}`}>Tutte le firme →</Link></div><div className="opinions-row grid-divided">{d.opinions.map((a) => <ArticleCard key={a.id} article={a} variant="opinion" showExcerpt />)}</div></section>
      )}
      {d.videos.length > 0 && (
        <section className="section"><div className="section-title"><h2>Video</h2><Link href="/video">Tutti i video →</Link></div><div className="grid grid-3 grid-divided">{d.videos.map((a) => <ArticleCard key={a.id} article={a} variant="sm" />)}</div></section>
      )}
      <div className="layout-sidebar" style={{ alignItems: 'start' }}><MostRead n={8} /><NewsletterWidget /></div>
    </>
  );
}
