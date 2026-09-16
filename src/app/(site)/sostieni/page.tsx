import type { Metadata } from 'next';
import { DonateWidget } from '@/components/site/donate-widget';
import { getSettings } from '@/lib/queries';
import { DEFAULT_DONATIONS } from '@/lib/models';

export const metadata: Metadata = { title: 'Sostienici', description: 'Sostieni il giornalismo locale con un contributo libero.' };
export default async function SupportPage({ searchParams }: PageProps<'/sostieni'>) {
  const [sp, s] = await Promise.all([searchParams, getSettings()]);
  const d = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  return (
    <div className="account" style={{ maxWidth: 640 }}>
      <div className="account-card">
        <h1>{d.title}</h1>
        {sp.grazie === '1' ? <p className="notice ok">{d.thanks}</p> : sp.annullato === '1' ? <p className="notice">Pagamento annullato: puoi riprovare quando vuoi.</p> : <p className="lead">{d.text}</p>}
        {d.enabled ? <DonateWidget full /> : <p className="notice">Al momento le donazioni non sono attive. Puoi sostenerci iscrivendoti alla newsletter o condividendo i nostri articoli.</p>}
      </div>
    </div>
  );
}
