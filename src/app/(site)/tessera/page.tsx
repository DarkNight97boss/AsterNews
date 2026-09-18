import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/queries';

export const metadata: Metadata = { title: 'Tessera del lettore', description: 'I vantaggi per chi sostiene il giornale nei negozi e nei locali della città.' };
export const dynamic = 'force-dynamic';
export default async function CardInfoPage() { const partners = (await getSettings()).commons?.partners ?? []; return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><h1>Tessera del lettore</h1><p className="lead">Chi sostiene il giornale ha una tessera sul telefono. Nei posti qui sotto basta mostrarla: il negoziante inquadra il codice e vede se è valida.</p><p><Link className="btn btn-primary" href="/account/tessera">Apri la mia tessera</Link></p><h2>Dove vale</h2>{partners.length === 0 ? <p className="help">Stiamo raccogliendo le prime adesioni.</p> : <ul className="trust-list">{partners.map((p, i) => <li key={i}><div><b>{p.name}</b><p>{p.benefit}</p><p className="help">{p.address}</p></div></li>)}</ul>}<p className="help">Hai un negozio e vuoi aderire? <Link href="/pubblicita">Scrivici</Link>.</p></div></div>; }
