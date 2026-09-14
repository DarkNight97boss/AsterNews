import Link from 'next/link';
import { ArticleList } from '@/components/site/article-list';
import { SmartImage } from '@/components/ui/smart-image';
import { Article, Category } from '@/lib/models';
import { articleUrlWith, getCategories } from '@/lib/queries';
import { FpPhotoCard } from './home-fanpage';
import { siteUrl } from '@/lib/site-url';

function FpWide({ a, cats, reverse = false }: { a: Article; cats: Category[]; reverse?: boolean }) {
  return <section className={`fp-wide ${reverse ? 'reverse' : ''}`}><Link href={articleUrlWith(a, cats)} className="fp-wide-img"><SmartImage src={a.coverImage} alt={a.title} sizes="(max-width: 768px) 100vw, 560px" /></Link><div className="fp-wide-body"><span className="fp-cat">{a.kicker}</span><h2><Link href={articleUrlWith(a, cats)}>{a.title}</Link></h2></div></section>;
}
export async function CategoryFanpage({ c, articles, total, page, perPage }: { c: Category; articles: Article[]; total: number; page: number; perPage: number }) {
  const cats = await getCategories();
  const cover = articles[0]?.coverImage;
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${siteUrl()}/${c.slug}`)}`;
  const first = page === 1;
  return (
    <>
      <section className="fp-sec-hero">
        <div className="fp-sec-cover">{cover && <SmartImage src={cover} alt={c.name} priority sizes="1100px" />}<h1>{c.name}</h1><div className="fp-sec-btns"><a className="fp-btn-blue" href="#newsletter">Segui</a><a className="fp-btn-blue" href={shareUrl} target="_blank" rel="noopener">Condividi f</a></div></div>
        <p className="fp-sec-desc">Le ultime <b>notizie di {c.name.toLowerCase()}</b> in tempo reale: {c.description} <Link href="/notizie"><b>[altro]</b></Link></p>
      </section>
      {articles.length === 0 && <div className="empty"><h3>Nessun articolo</h3></div>}
      {first && articles[0] && <FpWide a={articles[0]} cats={cats} />}
      {first && articles[1] && <FpWide a={articles[1]} cats={cats} reverse />}
      {first && articles.length > 2 && <div className="fp-grid4">{articles.slice(2, 6).map((a) => <FpPhotoCard key={a.id} a={a} cats={cats} />)}</div>}
      {first && articles.length > 6 && <div className="fp-grid3">{articles.slice(6, 9).map((a) => <FpPhotoCard key={a.id} a={a} cats={cats} />)}</div>}
      {(first ? articles.length > 9 : articles.length > 0) && <div className="fp-card"><ArticleList articles={first ? articles.slice(9) : articles} total={total} page={page} perPage={perPage} basePath={`/${c.slug}`} /></div>}
    </>
  );
}
