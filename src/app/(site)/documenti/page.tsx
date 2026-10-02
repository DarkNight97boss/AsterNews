import type { Metadata } from 'next';
import Link from 'next/link';
import { filterDocs } from '@/lib/archive';
import { listCards } from '@/lib/civic-data';

export const metadata: Metadata = { title: 'Catalogo dei documenti', description: 'Ogni documento citato dal giornale: delibere, bandi, relazioni, con l\'ente, la data e di cosa parla.' };
export const dynamic = 'force-dynamic';
export default async function DocumentsPage({ searchParams }: PageProps<'/documenti'>) {
  const sp = await searchParams; const q = typeof sp.q === 'string' ? sp.q.slice(0, 80) : ''; const ente = typeof sp.ente === 'string' ? sp.ente.slice(0, 80) : '';
  const all = await listCards('documento'); const enti = [...new Set(all.map((d) => d.fields.ente).filter(Boolean))].sort(); const list = filterDocs(all, q, ente);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Catalogo dei documenti</h1><p className="lead">Le carte dietro gli articoli, cercabili: {all.length} documenti.</p><form method="get" className="form-row"><input className="input" type="search" name="q" placeholder="Cerca (titolo, ente, argomento)" aria-label="Cerca" defaultValue={q} /><select className="select" name="ente" aria-label="Ente" defaultValue={ente}><option value="">Tutti gli enti</option>{enti.map((e) => <option key={e} value={e}>{e}</option>)}</select><button className="btn btn-outline" type="submit">Cerca</button></form>{list.length === 0 && <p className="help">Nessun documento trovato.</p>}<ul className="trust-list">{list.map((d) => <li key={d.id}><time>{d.fields.data || '—'}</time><div><Link href={`/schede/documento/${d.slug}`}>{d.title}</Link>{d.fields.url && <> · <a href={d.fields.url} target="_blank" rel="noopener">apri il file</a></>}<div className="help">{[d.fields.ente, (d.fields.riassunto ?? '').slice(0, 160)].filter(Boolean).join(' · ')}</div></div></li>)}</ul></div></div>;
}
