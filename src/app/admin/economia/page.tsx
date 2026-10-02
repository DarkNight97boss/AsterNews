import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings } from '@/lib/queries';
import { listFunds } from '@/lib/economy-data';
import { FundsManager, SponsorsManager } from '@/components/admin/economy-admin';

export const dynamic = 'force-dynamic';
export default async function EconomyAdminPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin'); const [s, cats, funds] = await Promise.all([getSettings(), getCategories(), listFunds()]);
  return <><div className="page-title"><div><h1>Economia locale</h1><p>Sponsor di sezione e crowdfunding per inchiesta. Negozi, lavoro, mercatino e affitti arrivano dai lettori e passano da Partecipazione; le schede dei negozi si modificano in Schede. Pagine: <a href="/negozi" target="_blank">negozi</a>, <a href="/aperture-chiusure" target="_blank">aperture e chiusure</a>, <a href="/lavoro" target="_blank">lavoro</a>, <a href="/mercatino" target="_blank">mercatino</a>, <a href="/affitti" target="_blank">affitti</a>, <a href="/pubblicita/numeri" target="_blank">pubblicità in numeri</a>, <a href="/sponsor" target="_blank">sponsor</a>, <a href="/abbonamento-di-quartiere" target="_blank">abbonamento di quartiere</a>, <a href="/inchieste" target="_blank">inchieste</a>.</p></div></div><div className="admin-grid-2"><SponsorsManager cats={cats.map((c) => ({ id: c.id, name: c.name }))} sponsors={s.sponsors ?? {}} /><FundsManager funds={funds} /></div></>;
}
