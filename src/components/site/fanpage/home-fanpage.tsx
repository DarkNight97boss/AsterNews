import Link from 'next/link';
import { Fragment } from 'react';
import { EventCard } from '@/components/site/event-card';
import { ArticleCard } from '@/components/site/article-card';
import { NewsletterWidget } from '@/components/site/widgets';
import { SmartImage } from '@/components/ui/smart-image';
import { Article, Category, User } from '@/lib/models';
import { articleUrlWith, getCategories, getMostRead, getUsers } from '@/lib/queries';
import { formatDate } from '@/lib/utils';
import type { HomeData } from '../home/home-data';
import { shortTime } from '../home/home-data';

const compact = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n));

export function FpMini({ a, cats, time = false }: { a: Article; cats: Category[]; time?: boolean }) {
  return <article className="fp-mini"><span className="fp-cat">{a.kicker || cats.find((c) => c.id === a.categoryId)?.name}</span><h3><Link href={articleUrlWith(a, cats)}>{time && <span className="fp-time">{shortTime(a)}</span>}{a.title}</Link></h3></article>;
}
export function FpPhotoCard({ a, cats, badge }: { a: Article; cats: Category[]; badge?: string }) {
  return (
    <Link href={articleUrlWith(a, cats)} className="fp-photo-card">
      <span className="fp-photo-img"><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 50vw, 300px" />{badge && <span className="fp-badge fp-badge-abs">{badge}</span>}{a.format === 'video' && !badge && <span className="fp-play">▶</span>}</span>
      <h3>{a.title}</h3>
    </Link>
  );
}
export function FpShow({ a, cats }: { a: Article; cats: Category[] }) {
  return (
    <section className="fp-show">
      <Link href={articleUrlWith(a, cats)} className="fp-show-img"><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 100vw, 560px" /><span className="fp-show-label">{cats.find((c) => c.id === a.categoryId)?.name}</span></Link>
      <div className="fp-show-box"><div><span className="fp-badge">▶ Video</span><span className="fp-date">{formatDate(a.publishedAt)}</span></div><h2><Link href={articleUrlWith(a, cats)}>{a.title}</Link></h2></div>
    </section>
  );
}
export function FpOpinion({ a, cats, author }: { a: Article; cats: Category[]; author?: User }) {
  return (
    <section className="fp-opinion">
      <div className="fp-opinion-box"><div><span className="fp-badge fp-badge-dark">❝ Opinione</span><span className="fp-date">{formatDate(a.publishedAt)}</span></div><h2><Link href={articleUrlWith(a, cats)}>{a.title}</Link></h2>{author && <span className="fp-by">di <b><Link href={`/autore/${author.id}`}>{author.name}</Link></b></span>}</div>
      <Link href={articleUrlWith(a, cats)} className="fp-opinion-img"><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 100vw, 560px" /></Link>
    </section>
  );
}

export async function HomeFanpage({ d }: { d: HomeData }) {
  const [cats, users, mostRead] = await Promise.all([getCategories(), getUsers(), getMostRead(6)]);
  const lead = d.hero[0]; const rel = d.hero.slice(1, 3);
  const flashPool = [...d.videos, ...d.latest.filter((a) => a.format === 'gallery')];
  const flash = (flashPool.length >= 4 ? flashPool : [...flashPool, ...d.latest.filter((a) => !flashPool.includes(a))]).slice(0, 4);
  const video = d.videos[0]; const opinion = d.opinions[0];
  const url = (a: Article) => articleUrlWith(a, cats);
  return (
    <>
      {lead && (
        <section className="fp-hero">
          <Link href={url(lead)} className="fp-hero-img"><SmartImage src={lead.coverImage} alt={lead.title} priority sizes="(max-width: 768px) 100vw, 1100px" /></Link>
          <h2 className="fp-hero-title"><Link href={url(lead)}>{lead.title}</Link></h2>
          <p className="fp-hero-lead">{lead.excerpt}</p>
          <div className="fp-hero-related">{rel.map((a) => <Link key={a.id} href={url(a)} className="fp-black-box">{a.title}</Link>)}</div>
        </section>
      )}
      <section className="fp-card"><div className="fp-card-head"><h2 className="fp-title">Flash</h2><Link href="/video">▸ Guarda tutti</Link></div>
        <div className="fp-flash">{flash.map((a) => <Link key={a.id} href={url(a)} className="fp-flash-item"><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 50vw, 260px" /><span className="fp-flash-brand">asternews</span><span className="fp-flash-cap"><span className="fp-heart">♥ {compact(a.views)}</span>{a.title}</span></Link>)}</div>
      </section>
      <section className="fp-card"><div className="fp-card-head"><h2 className="fp-title">Ultime notizie</h2><Link href="/notizie">▸ Tutte le notizie</Link></div><div className="fp-latest">{d.latest.slice(0, 4).map((a) => <FpMini key={a.id} a={a} cats={cats} time />)}</div></section>
      {d.sections.map((sec, i) => {
        const [first, ...others] = sec.articles;
        return (
          <Fragment key={sec.category.id}>
            <section className="fp-topic">
              <Link href={url(first)} className="fp-topic-img"><SmartImage src={first.coverImage} alt={first.title} sizes="(max-width: 768px) 100vw, 560px" /></Link>
              <div className="fp-topic-body"><Link className="fp-cat" href={`/${sec.category.slug}`}>{sec.category.name}</Link><h2><Link href={url(first)}>{first.title}</Link></h2></div>
              {others.length > 0 && <div className="fp-topic-related">{others.slice(0, 3).map((a) => <Link key={a.id} href={url(a)} className="fp-mini fp-mini-link">{a.title}</Link>)}</div>}
            </section>
            {i === 0 && video && <FpShow a={video} cats={cats} />}
            {i === 1 && opinion && <FpOpinion a={opinion} cats={cats} author={users.find((u) => u.id === opinion.authorId)} />}
            {i === 2 && d.events.length > 0 && <section className="fp-card"><div className="fp-card-head"><h2 className="fp-title">Cosa fare in città</h2><Link href="/eventi">▸ Tutti gli eventi</Link></div><div className="events-grid fp-events">{d.events.map((e) => <EventCard key={e.id} event={e} />)}</div></section>}
          </Fragment>
        );
      })}
      {d.dossierCat && d.dossierLead && <section className="fp-card"><div className="fp-card-head"><h2 className="fp-title">{d.dossierCat.name}</h2><Link href={`/${d.dossierCat.slug}`}>▸ Vai alla sezione</Link></div><div className="fp-grid4">{[d.dossierLead, ...d.dossierRest].slice(0, 4).map((a) => <FpPhotoCard key={a.id} a={a} cats={cats} badge="Dossier" />)}</div></section>}
      <div className="fp-two">
        <section className="fp-card"><div className="fp-card-head"><h2 className="fp-title">I più letti</h2></div><div className="most-week">{mostRead.map((m, i) => <ArticleCard key={m.id} article={m} variant="number" index={i + 1} />)}</div></section>
        <NewsletterWidget />
      </div>
    </>
  );
}
