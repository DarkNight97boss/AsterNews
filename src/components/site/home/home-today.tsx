import Link from 'next/link';
import { ArticleCard, KickerView } from '@/components/site/article-card';
import { FromCities } from '@/components/site/widgets';
import { SmartImage } from '@/components/ui/smart-image';
import { articleUrlWith, getCategories, getUsers } from '@/lib/queries';
import type { HomeData } from './home-data';
import { CommonSections } from './shared-sections';

export async function HomeToday({ d }: { d: HomeData }) {
  const [cats, users] = await Promise.all([getCategories(), getUsers()]);
  const { lead, pair, dossierLead, dossierCat, dossierRest } = d;
  const cat = (id: string) => cats.find((c) => c.id === id);
  return (
    <>
      <div className="home-top">
        <div className="home-main">
          {lead && (
            <section className="hero-lead">
              <div className="card card-hero"><div className="card-body"><KickerView article={lead} cat={cat(lead.categoryId)} /><h2 className="card-title"><Link href={articleUrlWith(lead, cats)}>{lead.title}</Link></h2><p className="card-excerpt">{lead.excerpt}</p></div></div>
              <Link className="card-img" href={articleUrlWith(lead, cats)} style={{ position: 'relative', display: 'block', aspectRatio: '3 / 2', overflow: 'hidden' }}><SmartImage src={lead.coverImage} alt={lead.title} priority sizes="(max-width: 768px) calc(100vw - 40px), 480px" /></Link>
            </section>
          )}
          <div className="hero-pair">{pair.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" />)}</div>
        </div>
        <aside className="home-side"><FromCities n={5} /></aside>
      </div>
      {dossierLead && (
        <section className="band"><div className="container"><div className="band-inner">
          <div><KickerView article={dossierLead} cat={cat(dossierLead.categoryId)} /><h2 className="band-title" style={{ marginTop: 10 }}><Link href={articleUrlWith(dossierLead, cats)}>{dossierLead.title}</Link></h2><div className="band-by">di {users.find((u) => u.id === dossierLead.authorId)?.name}</div><p className="band-excerpt">{dossierLead.excerpt}</p></div>
          <Link href={articleUrlWith(dossierLead, cats)} className="band-img"><SmartImage src={dossierLead.coverImage} alt={dossierLead.title} sizes="(max-width: 768px) calc(100vw - 40px), 480px" /></Link>
        </div></div></section>
      )}
      {dossierCat && dossierRest.length > 0 && (
        <section className="section band-dark" style={{ padding: '32px 0', marginBottom: 48 }}><div className="container"><div className="section-title section-title-stencil"><h2>{dossierCat.name}</h2><Link href={`/${dossierCat.slug}`}>Vai alla sezione →</Link></div><div className="grid grid-3 grid-divided">{dossierRest.map((a) => <ArticleCard key={a.id} article={a} variant="md" showExcerpt />)}</div></div></section>
      )}
      <CommonSections d={d} />
    </>
  );
}
