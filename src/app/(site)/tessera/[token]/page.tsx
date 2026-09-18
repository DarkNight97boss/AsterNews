import type { Metadata } from 'next';
import { verifySignedToken } from '@/lib/auth';
import { findReader } from '@/lib/repo-extra';

export const metadata: Metadata = { title: 'Verifica tessera', robots: { index: false } };
export const dynamic = 'force-dynamic';
/** Quello che vede il negoziante inquadrando il codice: la firma garantisce che la tessera non è stata fabbricata. */
export default async function VerifyCardPage({ params }: PageProps<'/tessera/[token]'>) {
  const id = await verifySignedToken(decodeURIComponent((await params).token)); const reader = id ? await findReader(id) : undefined; const ok = !!reader && !reader.banned && reader.premium;
  return <div className="account" style={{ maxWidth: 420 }}><div className={`card-check ${ok ? 'ok' : 'ko'}`} role="status"><p className="cc-mark">{ok ? '✓' : '✕'}</p><h1>{ok ? 'Tessera valida' : reader ? 'Tessera non attiva' : 'Tessera non riconosciuta'}</h1>{reader && <p>{reader.name || 'Lettore'}{reader.premium && reader.premiumUntil ? ` · sostenitore fino al ${new Date(reader.premiumUntil).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</p>}<p className="help">Controllo fatto il {new Date().toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p></div></div>;
}
