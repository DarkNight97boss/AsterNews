import type { Metadata } from 'next';
import Link from 'next/link';
import { listCards } from '@/lib/civic-data';

export const metadata: Metadata = { title: 'Punti utili', description: 'Dove ricaricare il telefono, trovare acqua, un luogo fresco, un punto di raccolta: la mappa che serve in un blackout o in un\'ondata di calore.' };
export const dynamic = 'force-dynamic';
export default async function PointsPage({ searchParams }: PageProps<'/punti-utili'>) {
  const sp = await searchParams; const tipo = typeof sp.tipo === 'string' ? sp.tipo : ''; const all = await listCards('punto'); const tipi = [...new Set(all.map((p) => p.fields.tipo).filter(Boolean))]; const list = tipo ? all.filter((p) => p.fields.tipo === tipo) : all;
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/emergenza">Emergenza</Link></p><h1>Punti utili</h1><p className="lead">Ricarica, acqua, riparo, raccolta. Pagina leggera: funziona anche con poca rete.</p><p className="chips"><Link className="chip" href="/punti-utili" style={!tipo ? { background: '#111', color: '#fff' } : undefined}>Tutti</Link>{tipi.map((t) => <Link key={t} className="chip" href={`/punti-utili?tipo=${encodeURIComponent(t)}`} style={tipo === t ? { background: '#111', color: '#fff' } : undefined}>{t}</Link>)}</p>{list.length === 0 && <p className="help">Nessun punto registrato.</p>}<ul className="trust-list">{list.map((p) => <li key={p.id}><div><b>{p.title}</b> <span className="help">· {p.fields.tipo}</span><div className="help">{[p.fields.indirizzo, p.fields.orari, p.fields.note].filter(Boolean).join(' · ')}</div>{p.fields.indirizzo && <a href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(p.fields.indirizzo)}`} target="_blank" rel="noopener">sulla mappa</a>}</div></li>)}</ul></div></div>;
}
