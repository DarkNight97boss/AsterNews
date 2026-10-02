import type { Metadata } from 'next';
import Link from 'next/link';
import { listCards } from '@/lib/civic-data';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Negozi e attività', description: 'Una pagina gratuita per ogni attività della città, con orari, indirizzo e l\'avviso del mese.' };
export const dynamic = 'force-dynamic';
export default async function ShopsPage({ searchParams }: PageProps<'/negozi'>) {
  const sp = await searchParams; const q = String(sp.q ?? '').toLowerCase(); const cat = String(sp.categoria ?? ''); const all = (await listCards('negozio')).filter((c) => c.fields.stato !== 'Chiuso'); const cats = [...new Set(all.map((c) => c.fields.categoria).filter(Boolean))].sort(); const list = all.filter((c) => (!cat || c.fields.categoria === cat) && (!q || `${c.title} ${c.fields.via} ${c.fields.categoria}`.toLowerCase().includes(q)));
  return <div className="account" style={{ maxWidth: 860 }}><div className="account-card trust-page"><h1>Negozi e attività</h1><p className="lead">La vetrina della città: ogni attività ha una pagina gratuita con orari, contatti e un avviso al mese. <Link href="/aperture-chiusure">Chi apre e chi chiude</Link>.</p><form method="get" className="ef-form" style={{ marginBottom: 12 }}><input className="input" name="q" defaultValue={q} placeholder="Cerca per nome o via" aria-label="Cerca" /><select className="select" name="categoria" defaultValue={cat} aria-label="Categoria"><option value="">Tutte le categorie</option>{cats.map((c) => <option key={c}>{c}</option>)}</select><button className="btn btn-dark">Cerca</button></form>{list.length === 0 ? <p className="help">Nessuna attività trovata.</p> : <ul className="hub-grid">{list.map((c) => <li key={c.id}><Link href={`/schede/negozio/${c.slug}`}>{c.title}</Link><p>{[c.fields.categoria, c.fields.via].filter(Boolean).join(' · ')}{c.fields.stato === 'Nuova apertura' ? ' · nuova apertura' : ''}</p>{c.fields.avviso && <p className="help">📣 {c.fields.avviso.slice(0, 80)}</p>}</li>)}</ul>}<ContributionForm kind="negozio-richiesta" /></div></div>;
}
