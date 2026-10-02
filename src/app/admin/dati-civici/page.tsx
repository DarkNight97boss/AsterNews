import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listSeries } from '@/lib/civic-data';
import { CivicForm, SeriesManager } from '@/components/admin/civic-admin';

export const dynamic = 'force-dynamic';
export default async function CivicAdminPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin'); const [s, series] = await Promise.all([getSettings(), listSeries()]);
  return <><div className="page-title"><div><h1>Dati civici</h1><p>Le serie del cruscotto, il bilancio ad albero, il paniere e le linee: tutto finisce in <a href="/citta" target="_blank">/citta</a>. I contributi dei lettori (prezzi, rumore, ritardi, alberi, foto dei cantieri) passano da Partecipazione.</p></div></div><SeriesManager series={series} />{can(me, 'settings.manage') && <CivicForm initial={s.civic ?? {}} />}</>;
}
