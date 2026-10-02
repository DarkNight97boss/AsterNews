import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listRecords } from '@/lib/records';
import { latestRadio, listVignette } from '@/lib/formats-data';
import { FormatsAdmin } from '@/components/admin/formats-admin';

export const dynamic = 'force-dynamic';
export default async function FormatsPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin'); const [v, radio, er] = await Promise.all([listVignette(), latestRadio(), listRecords('ereader', { status: 'approved', limit: 5000 })]);
  return <><div className="page-title"><div><h1>Formati e dispositivi</h1><p>Vignetta, radio del mattino, e-reader. Le altre uscite non hanno bisogno di gestione: <a href="/auto" target="_blank">in auto</a> (podcast con capitoli), <a href="/striscione" target="_blank">striscione</a> per gli schermi verticali, <a href="/album" target="_blank">album mensili</a>, formato «lettera» nell&apos;editor, dialetto nelle traduzioni volontarie, Braille da ogni articolo (<code>/api/export/braille/[id]</code>), notifiche per orologio in <a href="/notifiche" target="_blank">/notifiche</a>.</p></div></div><FormatsAdmin vignette={v.map((x) => ({ id: x.id, image: x.data.image, caption: x.data.caption, createdAt: x.createdAt }))} ereaders={er.length} radio={radio[0] ? { date: radio[0].data.date, url: radio[0].data.url } : null} /></>;
}
