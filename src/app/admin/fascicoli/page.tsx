import { requireUser } from '@/lib/auth';
import { getTags } from '@/lib/queries';
import { listRecords } from '@/lib/records';
import { Dossiers } from '@/components/admin/dossiers';
import type { Dossier } from '@/lib/actions-method';

export const dynamic = 'force-dynamic';
export default async function DossiersPage() { await requireUser(); const [list, tags] = await Promise.all([listRecords<Dossier>('dossier', { limit: 200 }), getTags()]); return <><div className="page-title"><div><h1>Fascicoli</h1><p>Per le storie lunghe: documenti, cronologia, persone, note. Solo interno. Il riassunto lo fa l&apos;AI quando serve passare la mano.</p></div></div><Dossiers list={list.map((r) => ({ id: r.id, owner: r.owner, ...r.data }))} tags={tags.map((t) => ({ id: t.id, name: t.name }))} /></>; }
