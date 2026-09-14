import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import { SmartImage } from '@/components/ui/smart-image';
import { articleUrlWith, getCategories } from '@/lib/queries';
import type { HomeData } from './home-data';
import { shortTime } from './home-data';
import { CommonSections } from './shared-sections';

export async function HomeGrid({ d }: { d: HomeData }) {
  const cats = await getCategories();
  const [lead, ...side] = d.hero;
  return (
    <>
      {lead && <section className="hero-grid"><ArticleCard article={lead} variant="overlay" showExcerpt priority /><div className="hero-grid-side">{side.slice(0, 2).map((a) => <ArticleCard key={a.id} article={a} variant="md" />)}</div></section>}
      <section className="section">
        <div className="section-title"><h2>Ultime notizie</h2><Link href="/notizie">Tutte le notizie →</Link></div>
        <div className="grid grid-4">
          {d.latest.map((a) => (
            <article key={a.id} className="card card-sm">
              <Link className="card-img" href={articleUrlWith(a, cats)}><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 50vw, 300px" /></Link>
              <div className="card-body"><div className="meta"><span className="time-badge">{shortTime(a)}</span> <b>{cats.find((c) => c.id === a.categoryId)?.name}</b></div><h3 className="card-title"><Link href={articleUrlWith(a, cats)}>{a.title}</Link></h3></div>
            </article>
          ))}
        </div>
      </section>
      {d.dossierCat && d.dossierLead && <section className="section"><div className="section-title"><h2>{d.dossierCat.name}</h2><Link href={`/${d.dossierCat.slug}`}>Vai alla sezione →</Link></div><div className="grid grid-4">{[d.dossierLead, ...d.dossierRest].map((a) => <ArticleCard key={a.id} article={a} variant="sm" />)}</div></section>}
      <CommonSections d={d} />
    </>
  );
}
