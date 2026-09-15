import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyReaderAction } from '@/lib/actions-readers';

export const metadata: Metadata = { title: 'Conferma account', robots: { index: false } };

export default async function VerifyReaderPage({ searchParams }: PageProps<'/account/verifica'>) {
  const { t } = await searchParams;
  const ok = typeof t === 'string' && (await verifyReaderAction(t));
  return (
    <div className="page-head" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
      <h1>{ok ? 'Account confermato' : 'Link non valido'}</h1>
      <p>{ok ? 'Benvenuto! Sei già dentro: puoi commentare e gestire il tuo profilo.' : 'Il link è scaduto o già usato. Prova ad accedere o a registrarti di nuovo.'}</p>
      <p><Link href="/account" className="btn btn-primary">Vai al mio account</Link></p>
    </div>
  );
}
