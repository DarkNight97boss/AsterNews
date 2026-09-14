import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import type { HomeData } from './home-data';
import { CommonSections } from './shared-sections';

/** Layout "magazine": mosaico di foto grandi, poi sezioni a 3 colonne con sommari. */
export function HomeMagazine({ d }: { d: HomeData }) {
  const [lead, ...rest] = d.hero;
  return (
    <>
      {lead && (
        <section className="mosaic">
          <ArticleCard article={lead} variant="overlay" showExcerpt priority />
          {rest.slice(0, 4).map((a) => <ArticleCard key={a.id} article={a} variant="overlay-sm" />)}
        </section>
      )}
      {d.dossierCat && d.dossierLead && (
        <section className="section"><div className="section-title"><h2>{d.dossierCat.name}</h2><Link href={`/${d.dossierCat.slug}`}>Vai alla sezione →</Link></div>
          <div className="grid grid-3">{[d.dossierLead, ...d.dossierRest].slice(0, 3).map((a) => <ArticleCard key={a.id} article={a} variant="md" showExcerpt showMeta />)}</div></section>
      )}
      <section className="section">
        <div className="section-title"><h2>Ultime notizie</h2><Link href="/notizie">Tutte le notizie →</Link></div>
        <div className="grid grid-3">{d.latest.slice(0, 6).map((a) => <ArticleCard key={a.id} article={a} variant="md" showMeta />)}</div>
      </section>
      <CommonSections d={d} sectionVariant="md" cols={3} />
    </>
  );
}
