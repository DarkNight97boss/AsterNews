import type { Metadata } from 'next';
import Link from 'next/link';
import { confirm } from '@/lib/newsletter';

export const metadata: Metadata = { title: 'Conferma iscrizione', robots: { index: false } };

export default async function ConfirmPage({ searchParams }: PageProps<'/newsletter/conferma'>) {
  const { t } = await searchParams;
  const ok = typeof t === 'string' && (await confirm(t));
  return (
    <div className="page-head" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
      <h1>{ok ? 'Iscrizione confermata 🎉' : 'Link non valido'}</h1>
      <p>{ok ? 'Da domani mattina riceverai la rassegna con le notizie del giorno.' : 'Il link di conferma è scaduto o è già stato usato. Puoi iscriverti di nuovo dal sito.'}</p>
      <p><Link href="/" className="btn btn-primary">Torna alla home</Link></p>
    </div>
  );
}
