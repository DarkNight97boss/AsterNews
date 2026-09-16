import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import { EventCard } from '@/components/site/event-card';
import { MostRead, NewsletterWidget } from '@/components/site/widgets';
import type { Event } from '@/lib/models';
import type { ResolvedBlock } from '@/lib/home-blocks';

const cols = (l: string) => (l === 'grid3' ? 3 : l === 'grid2' ? 2 : 4);
/** Rendering dei blocchi del builder della home. */
export function HomeBlocks({ blocks, events }: { blocks: ResolvedBlock[]; events: Event[] }) {
  return (
    <>
      {blocks.map((r) => {
        const b = r.block; const key = b.id;
        if (b.type === 'events') return events.length ? <section key={key} className="section home-events"><div className="section-title"><h2>{r.title || 'Cosa fare in città'}</h2><Link href="/eventi">Tutti gli eventi →</Link></div><div className="events-grid">{events.slice(0, b.count || 4).map((e) => <EventCard key={e.id} event={e} />)}</div></section> : null;
        if (b.type === 'mostread') return <div key={key} className="layout-sidebar" style={{ alignItems: 'start' }}><MostRead n={b.count || 8} /></div>;
        if (b.type === 'newsletter') return <div key={key} className="layout-sidebar" style={{ alignItems: 'start' }}><NewsletterWidget /></div>;
        if (b.type === 'html') return <section key={key} className="section home-html" dangerouslySetInnerHTML={{ __html: b.html ?? '' }} />;
        if (r.groups) return <div key={key}>{r.groups.map((g) => <section key={g.link} className="section"><div className="section-title"><h2>{g.title}</h2><Link href={g.link}>Vai alla sezione →</Link></div><Grid layout={b.layout} articles={g.articles} /></section>)}</div>;
        if (b.layout === 'band') return <section key={key} className="section band"><div className="band-inner"><div className="section-title"><h2>{r.title}</h2>{r.link && <Link href={r.link}>Tutti →</Link>}</div><div className="grid grid-4">{r.articles.map((a) => <ArticleCard key={a.id} article={a} variant="sm" />)}</div></div></section>;
        return <section key={key} className="section"><div className="section-title"><h2>{r.title}</h2>{r.link && <Link href={r.link}>Vai alla sezione →</Link>}</div><Grid layout={b.layout} articles={r.articles} /></section>;
      })}
    </>
  );
}
function Grid({ layout, articles }: { layout: string; articles: ResolvedBlock['articles'] }) {
  if (layout === 'list') return <div className="list-divided">{articles.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal" showExcerpt showMeta />)}</div>;
  const c = cols(layout); return <div className={`grid grid-${c} grid-divided`}>{articles.map((a) => <ArticleCard key={a.id} article={a} variant={c === 2 ? 'md' : 'sm'} showMeta />)}</div>;
}
