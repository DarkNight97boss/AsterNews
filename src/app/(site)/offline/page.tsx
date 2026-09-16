import Link from 'next/link';
export const metadata = { title: 'Sei offline', robots: { index: false } };
export default function OfflinePage() {
  return <div className="account" style={{ maxWidth: 560 }}><div className="account-card"><h1>Sei offline</h1><p>Nessuna connessione. Gli articoli che hai salvato per la lettura offline sono disponibili in <Link href="/account/salvati">Articoli salvati</Link>.</p></div></div>;
}
