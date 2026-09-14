import type { Metadata } from 'next';
import { EventSubmitForm } from '@/components/site/event-submit-form';
import { getZones } from '@/lib/queries';

export const metadata: Metadata = { title: 'Segnala un evento', robots: { index: false } };

export default function SubmitEventPage() {
  return (
    <>
      <div className="section-head"><h1>Segnala un evento</h1><p className="desc">Organizzi un concerto, una mostra, una sagra? Compila il modulo: la redazione verificherà la segnalazione prima della pubblicazione.</p></div>
      <div style={{ maxWidth: 720 }}><EventSubmitForm zones={getZones().map((z) => ({ id: z.id, name: z.name }))} /></div>
    </>
  );
}
