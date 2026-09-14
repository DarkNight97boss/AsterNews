import Link from 'next/link';
import { ArticleCard, Kicker } from '@/components/site/article-card';
import { FromCities } from '@/components/site/widgets';
import { SmartImage } from '@/components/ui/smart-image';
import { articleUrl, user } from '@/lib/queries';
import type { HomeData } from './home-data';
import { CommonSections } from './shared-sections';

export function HomeToday({ d }: { d: HomeData }) {
  const { lead, pair, dossierLead, dossierCat, dossierRest } = d;
  return (
    <>
      <div className="home-top">
        <div className="home-main">
          {lead && (
            <section className="hero-lead">
              <div className="card card-hero"><div className="card-body"><Kicker article={lead} /><h2 className="card-title"><Link href={articleUrl(lead)}>{lead.title}</Link></h2><p className="card-excerpt">{lead.excerpt}</p></div></div>
              <Link className="card-img" href={articleUrl(lead)} style={{ position: 'relative', display: 'block', aspectRatio: '3 / 2', overflow: 'hidden' }}><SmartImage src={lead.coverImage} alt={lead.title} priority sizes="(max-width: 768px) 100vw, 480px" /></Link>
            </section>
          )}
          <div className="hero-pair">{pair.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" />)}</div>
        </div>
        <aside className="home-side"><FromCities n={5} /></aside>
      </div>
      {dossierLead && (
        <section className="band"><div className="container"><div className="band-inner">
          <div><Kicker article={dossierLead} /><h2 className="band-title" style={{ marginTop: 10 }}><Link href={articleUrl(dossierLead)}>{dossierLead.title}</Link></h2><div className="band-by">di {user(dossierLead.authorId)?.name}</div><p className="band-excerpt">{dossierLead.excerpt}</p></div>
          <Link href={articleUrl(dossierLead)} className="band-img"><SmartImage src={dossierLead.coverImage} alt={dossierLead.title} sizes="(max-width: 768px) 100vw, 480px" /></Link>
        </div></div></section>
      )}
      {dossierCat && dossierRest.length > 0 && (
        <section className="section band-dark" style={{ padding: '32px 0', marginBottom: 48 }}><div className="container">
          <div className="section-title section-title-stencil"><h2>{dossierCat.name}</h2><Link href={`/${dossierCat.slug}`}>Vai alla sezione →</Link></div>
          <div className="grid grid-3 grid-divided">{dossierRest.map((a) => <ArticleCard key={a.id} article={a} variant="md" showExcerpt />)}</div>
        </div></section>
      )}
      <CommonSections d={d} />
    </>
  );
}
