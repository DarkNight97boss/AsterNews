import type { Metadata } from 'next';
import { getCategories, getSettings } from '@/lib/queries';

export const metadata: Metadata = { title: 'Sponsor di sezione', description: 'Le aziende che sostengono una sezione, con il contratto pubblicato e nessun potere sui contenuti.' };
export const dynamic = 'force-dynamic';
export default async function SponsorsPage() {
  const [s, cats] = await Promise.all([getSettings(), getCategories()]); const list = Object.entries(s.sponsors ?? {}).map(([id, sp]) => ({ cat: cats.find((c) => c.id === id), sp })).filter((x) => x.cat);
  return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><h1>Sponsor di sezione</h1><p className="lead">Un&apos;azienda può sostenere una sezione del giornale: il suo nome compare in testata, il contratto è pubblico. Non legge gli articoli prima, non li sceglie, non li commenta. Se succede, lo scriviamo.</p>{list.length === 0 ? <p className="help">Nessuna sezione ha uno sponsor in questo momento.</p> : <ul className="trust-list">{list.map(({ cat, sp }) => <li key={cat!.id}><div><b>{cat!.name}</b> · sostenuta da {sp.url ? <a href={sp.url} rel="noopener sponsored" target="_blank">{sp.name}</a> : sp.name}{sp.until && <span className="help"> fino al {new Date(sp.until).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}{sp.note && <p>{sp.note}</p>}{sp.contractUrl ? <p><a href={sp.contractUrl} rel="noopener" target="_blank">Leggi il contratto</a></p> : <p className="help">Contratto non ancora pubblicato.</p>}</div></li>)}</ul>}</div></div>;
}
