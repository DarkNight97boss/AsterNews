import type { Metadata } from 'next';
import { getSettings } from '@/lib/queries';
import { AD_SLOTS } from '@/lib/models';
import { AdOrderForm } from '@/components/site/ad-order-form';

export const metadata: Metadata = { title: 'Pubblicità', description: 'Promuovi la tua attività: scegli lo spazio, il periodo e paga online.' };
export const dynamic = 'force-dynamic';
export default async function AdvertisePage({ searchParams }: PageProps<'/pubblicita'>) {
  const [s, sp] = await Promise.all([getSettings(), searchParams]); const cfg = s.adSales; const slots = AD_SLOTS.filter((x) => (cfg?.prices?.[x.id] ?? 0) > 0).map((x) => ({ ...x, price: cfg!.prices[x.id] }));
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card"><h1>Pubblicità su {s.siteName}</h1><p className="lead">{cfg?.note || 'Raggiungi i lettori della tua città: scegli lo spazio e il periodo, carica il banner e paga online. La redazione verifica il materiale prima della messa online.'}</p>
    {sp.ordine === 'ok' && <p className="notice ok">Pagamento ricevuto: verifichiamo il banner e ti avvisiamo alla partenza.</p>}{sp.ordine === 'annullato' && <p className="notice">Ordine annullato: nessun addebito.</p>}
    {cfg?.enabled && slots.length ? <AdOrderForm slots={slots} /> : <p className="notice">La vendita online non è attiva: scrivi alla redazione per un preventivo.</p>}</div></div>;
}
