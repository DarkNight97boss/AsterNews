import type { Metadata } from 'next';
import Link from 'next/link';
import { verifySignedToken } from '@/lib/auth';
import { unsubscribe } from '@/lib/newsletter';

export const metadata: Metadata = { title: 'Disiscrizione', robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: PageProps<'/newsletter/disiscrivi'>) {
  const { t } = await searchParams;
  const id = typeof t === 'string' ? await verifySignedToken(t) : null;
  const ok = id ? await unsubscribe(id) : false;
  return (
    <div className="page-head" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
      <h1>{ok ? 'Disiscrizione completata' : 'Link non valido'}</h1>
      <p>{ok ? 'Non riceverai più la newsletter. Ci dispiace vederti andare: puoi iscriverti di nuovo quando vuoi.' : 'Il link non è valido. Scrivi alla redazione per essere rimosso manualmente.'}</p>
      <p><Link href="/" className="btn btn-primary">Torna alla home</Link></p>
    </div>
  );
}
