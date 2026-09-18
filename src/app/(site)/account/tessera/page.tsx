import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { getCurrentReader, signedToken } from '@/lib/auth';
import { getSettings } from '@/lib/queries';
import { siteUrl } from '@/lib/site-url';

export const metadata: Metadata = { title: 'La mia tessera', robots: { index: false } };
export const dynamic = 'force-dynamic';
export default async function MyCardPage() {
  const reader = await getCurrentReader(); if (!reader) redirect('/account?redirect=/account/tessera'); const s = await getSettings(); const url = `${siteUrl()}/tessera/${encodeURIComponent(await signedToken(reader.id))}`; const qr = await QRCode.toDataURL(url, { margin: 1, width: 360 });
  return <div className="account" style={{ maxWidth: 420 }}><div className={`reader-card${reader.premium ? ' premium' : ''}`}><p className="rc-site">{s.siteName}</p><p className="rc-kind">{reader.premium ? 'Sostenitore' : 'Lettore registrato'}</p><img src={qr} alt="Codice della tessera da far inquadrare" width={220} height={220} /><p className="rc-name">{reader.name || reader.email.split('@')[0]}</p><p className="rc-since">lettore dal {new Date(reader.createdAt).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</p></div><p className="help" style={{ textAlign: 'center' }}>{reader.premium ? 'Mostrala nei negozi che aderiscono: chi inquadra il codice vede solo il tuo nome e che la tessera è valida.' : 'I vantaggi nei negozi sono riservati a chi sostiene il giornale con l\'abbonamento.'}</p></div>;
}
