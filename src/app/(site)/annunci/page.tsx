import type { Metadata } from 'next';
import Link from 'next/link';
import { Sidebar } from '@/components/site/widgets';
import { LISTING_CATEGORIES } from '@/lib/models';
import { getZones } from '@/lib/queries';
import { listListings } from '@/lib/repo-extra2';
import { listingsSettings } from '@/lib/actions-listings';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Annunci', description: 'Annunci di casa, lavoro, auto e servizi dal territorio.' };
export default async function ListingsPage({ searchParams }: PageProps<'/annunci'>) {
  const sp = await searchParams; const cat = typeof sp.categoria === 'string' ? sp.categoria : ''; const q = typeof sp.q === 'string' ? sp.q : '';
  const [items, zones, s] = await Promise.all([listListings({ kind: 'annuncio', status: 'published', category: cat || undefined, q: q || undefined }, 60), getZones(), listingsSettings()]);
  return (
    <>
      <div className="page-head"><span className="kicker">Territorio</span><h1>Annunci</h1><p>Casa, lavoro, auto, oggetti e servizi dalla tua zona. {s.enabled && <Link href="/annunci/nuovo" className="btn btn-primary btn-sm">Pubblica un annuncio{s.priceAnnuncio > 0 ? ` · ${s.priceAnnuncio.toFixed(2).replace('.', ',')} €` : ''}</Link>}</p>
        <form className="search-filters" method="get" style={{ marginTop: 10 }}><select className="select" name="categoria" defaultValue={cat}><option value="">Tutte le categorie</option>{LISTING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select><input className="input" name="q" placeholder="Cerca…" defaultValue={q} /><button className="btn btn-dark btn-sm" type="submit">Filtra</button></form></div>
      <div className="layout-sidebar"><div className="listings-grid">
        {items.map((l) => <Link key={l.id} href={`/annunci/${l.id}`} className="listing-card">{l.image && <img src={l.image} alt="" loading="lazy" />}<div className="lc-body"><span className="lc-cat">{l.category}{l.zoneId && ` · ${zones.find((z) => z.id === l.zoneId)?.name ?? ''}`}</span><h3>{l.title}</h3>{l.price && <b className="lc-price">{l.price}</b>}<span className="lc-date">{formatDate(l.publishedAt ?? l.createdAt, false)}</span></div></Link>)}
        {items.length === 0 && <p className="help">Nessun annuncio pubblicato{cat ? ' in questa categoria' : ''}.</p>}
      </div><Sidebar /></div>
    </>
  );
}
