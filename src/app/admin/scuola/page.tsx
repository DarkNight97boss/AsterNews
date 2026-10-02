import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings, getUsers } from '@/lib/queries';
import { listRecords } from '@/lib/records';
import { AccessForm, StageManager } from '@/components/admin/school-admin';

export const dynamic = 'force-dynamic';
export default async function SchoolAdminPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin'); const [s, users, stages] = await Promise.all([getSettings(), getUsers(), listRecords<{ student: string; school: string; week: string; text: string; articleId: string }>('stage', { limit: 100 })]);
  return <><div className="page-title"><div><h1>Scuola, giovani, anziani</h1><p>Giornali delle scuole (si assegnano dall&apos;editor, pannello «Per chi legge»), stage, notiziario telefonico, letture dei volontari (da Partecipazione). Pagine: <a href="/giornali-scolastici" target="_blank">giornali</a>, <a href="/stage" target="_blank">stage</a>, <a href="/leggibile" target="_blank">leggibile</a>, <a href="/ascolta-al-telefono" target="_blank">telefono</a>, <a href="/stampa/lettera" target="_blank">lettera settimanale</a>, <a href="/memorie" target="_blank">memorie</a>, <a href="/famiglie" target="_blank">famiglie</a>, <a href="/giochi" target="_blank">giochi</a>.</p></div></div><div className="admin-grid-2"><StageManager list={stages.map((r) => ({ id: r.id, ...r.data }))} />{can(me, 'settings.manage') && <AccessForm initial={s.access ?? {}} users={users.filter((u) => u.active !== false).map((u) => ({ id: u.id, name: u.name }))} />}</div></>;
}
