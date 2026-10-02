import type { Metadata } from 'next';
import Link from 'next/link';
import { listDeposits, verifyChain } from '@/lib/archive-data';

export const metadata: Metadata = { title: 'Deposito legale digitale', description: 'Ogni giorno di pubblicazione ha un\'impronta crittografica concatenata alla precedente: nessuno può riscrivere il passato senza che si veda.' };
export const dynamic = 'force-dynamic';
export default async function DepositPage() {
  const [list, chain] = await Promise.all([listDeposits(400), verifyChain()]);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Deposito legale digitale</h1><p className="lead">Ogni notte il giornale impacchetta gli articoli del giorno prima in un fascicolo e ne calcola l&apos;impronta SHA-256, concatenata a quella del giorno precedente. Chi altera un articolo vecchio rompe la catena da lì in avanti. Le impronte sono qui, pubbliche; i fascicoli vanno anche a un archivio esterno, se la redazione lo ha indicato.</p><p className={chain.ok ? 'dec-accolta' : 'error-text'}><b>{chain.n} giorni depositati · catena {chain.ok ? 'integra' : `rotta al ${chain.brokenAt}`}</b></p>{list.length === 0 && <p className="help">Nessun deposito ancora.</p>}<table className="table"><thead><tr><th>Giorno</th><th>Articoli</th><th>Impronta</th><th></th></tr></thead><tbody>{list.map((d) => <tr key={d.date}><td><Link href={`/giornale/${d.date}`}>{d.date}</Link></td><td>{d.n}</td><td><code title={d.hash}>{d.hash.slice(0, 16)}…</code></td><td><a href={`/api/export/deposito/${d.date}`}>fascicolo</a>{d.url && <> · <a href={d.url} target="_blank" rel="noopener">copia depositata</a></>}</td></tr>)}</tbody></table><p className="help">Per verificare: scarica il fascicolo, calcola <code>sha256(impronta_precedente + &quot;\n&quot; + fascicolo)</code> e confronta. <Link href="/trasparenza">Trasparenza</Link>.</p></div></div>;
}
