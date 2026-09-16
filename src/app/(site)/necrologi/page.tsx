import type { Metadata } from 'next';
import Link from 'next/link';
import { Sidebar } from '@/components/site/widgets';
import { listListings } from '@/lib/repo-extra2';
import { listingsSettings } from '@/lib/actions-listings';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Necrologi', description: 'Necrologi, anniversari e ringraziamenti.' };
export default async function ObituariesPage() {
  const [items, s] = await Promise.all([listListings({ kind: 'necrologio', status: 'published' }, 100), listingsSettings()]);
  return (
    <>
      <div className="page-head"><span className="kicker">Comunità</span><h1>Necrologi</h1><p>Annunci funebri, anniversari e ringraziamenti. {s.enabled && <Link href="/annunci/nuovo?tipo=necrologio" className="btn btn-outline btn-sm">Pubblica un necrologio{s.priceNecrologio > 0 ? ` · ${s.priceNecrologio.toFixed(2).replace('.', ',')} €` : ''}</Link>}</p></div>
      <div className="layout-sidebar"><div className="obituaries">
        {items.map((l) => <article key={l.id} className="obituary"><div className="ob-cross">✝</div>{l.image && <img src={l.image} alt="" loading="lazy" />}<div><h3><Link href={`/annunci/${l.id}`}>{l.title}</Link></h3>{l.extra.date && <p className="ob-date">{l.extra.date}</p>}<div className="ob-body" dangerouslySetInnerHTML={{ __html: l.body.replace(/\n/g, '<br />') }} />{l.extra.funeral && <p className="ob-funeral"><b>Esequie:</b> {l.extra.funeral}</p>}<p className="help">Pubblicato il {formatDate(l.publishedAt ?? l.createdAt, false)}</p></div></article>)}
        {items.length === 0 && <p className="help">Nessun necrologio pubblicato.</p>}
      </div><Sidebar /></div>
    </>
  );
}
