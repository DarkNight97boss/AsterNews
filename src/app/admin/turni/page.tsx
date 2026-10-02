import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getUsers } from '@/lib/queries';
import { listRecords } from '@/lib/records';
import { Shifts } from '@/components/admin/shifts';

export const dynamic = 'force-dynamic';
export default async function ShiftsPage() { const me = await requireUser(); const [users, shifts] = await Promise.all([getUsers(), listRecords<{ date: string; userId: string; kind: string; note: string }>('shift', { limit: 1000 })]); return <><div className="page-title"><div><h1>Turni e reperibilità</h1><p>Chi è in turno e chi risponde fuori orario. Le emergenze dichiarate segnalano a chi è di reperibilità.</p></div></div><Shifts users={users.filter((u) => u.active !== false).map((u) => ({ id: u.id, name: u.name }))} shifts={shifts.map((s) => ({ id: s.id, ...s.data }))} canEdit={can(me, 'article.assign')} /></>; }
