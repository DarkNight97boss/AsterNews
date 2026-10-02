import type { Metadata } from 'next';
import { DonateWidget } from '@/components/site/donate-widget';
import { getSettings } from '@/lib/queries';
import { DEFAULT_DONATIONS, DEFAULT_PAYWALL } from '@/lib/models';
import { FairPrice } from '@/components/site/eco';

export const metadata: Metadata = { title: 'Sostienici', description: 'Sostieni il giornalismo locale con un contributo libero.' };
export default async function SupportPage({ searchParams }: PageProps<'/sostieni'>) {
  const [sp, s] = await Promise.all([searchParams, getSettings()]);
  const d = { ...DEFAULT_DONATIONS, ...(s.donations ?? {}) };
  return (
    <div className="account" style={{ maxWidth: 640 }}>
      <div className="account-card">
        <h1>{d.title}</h1>
        {sp.grazie === '1' ? <p className="notice ok">{d.thanks}</p> : sp.annullato === '1' ? <p className="notice">Pagamento annullato: puoi riprovare quando vuoi.</p> : <p className="lead">{d.text}</p>}
        <FairPrice full={{ ...DEFAULT_PAYWALL, ...(s.paywall ?? {}) }.monthlyPrice} />
        {sp.messaggio && <p className="notice">{String(sp.messaggio).startsWith('caffè:') ? '☕ Stai offrendo un caffè a chi ha scritto l\'articolo: una piccola cifra, ma arriva a chi lavora.' : String(sp.messaggio).startsWith('inchiesta:') ? '🔎 Stai finanziando un\'inchiesta: vedrai gli aggiornamenti e il resoconto delle spese nella sua pagina.' : ''}</p>}
        {d.enabled ? <DonateWidget full preset={{ amount: Number(sp.importo) || undefined, message: sp.messaggio ? String(sp.messaggio).slice(0, 120) : undefined }} /> : <p className="notice">Al momento le donazioni non sono attive. Puoi sostenerci iscrivendoti alla newsletter o condividendo i nostri articoli.</p>}
      </div>
    </div>
  );
}
