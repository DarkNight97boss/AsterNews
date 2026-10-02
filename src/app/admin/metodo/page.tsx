import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listRecords } from '@/lib/records';
import { AnonSources, MethodForm, OblivionQueue, Postmortems } from '@/components/admin/method-admin';

export const dynamic = 'force-dynamic';
export default async function MethodPage() {
  const me = await requireUser(); const [s, anon, oblivion, pms] = await Promise.all([getSettings(), listRecords<{ title: string; by: string; allowed: string[] }>('anon-source', { limit: 300 }), listRecords<Record<string, string>>('oblio', { status: 'pending', limit: 100 }), listRecords<{ title: string; what: string; why: string; change: string; articleId: string }>('postmortem', { limit: 100 })]);
  return <><div className="page-title"><div><h1>Metodo</h1><p>Le regole della casa: check-list per genere, lessico, due fonti, rilettura incrociata; il registro cifrato delle fonti anonime; il diritto all&apos;oblio; i post-mortem. Turni e fascicoli hanno pagine proprie.</p></div></div>{can(me, 'settings.manage') && <MethodForm initial={s.method ?? {}} />}<div className="admin-grid-2"><AnonSources list={anon.map((r) => ({ id: r.id, title: r.data.title, by: r.data.by, createdAt: r.createdAt, mine: r.data.allowed.includes(me.id) }))} />{can(me, 'settings.manage') ? <OblivionQueue list={oblivion.map((r) => ({ id: r.id, reason: r.data.reason, url: r.data.url, text: r.data.text, name: r.data.name, createdAt: r.createdAt }))} /> : <div />}</div>{can(me, 'article.publish') && <Postmortems list={pms.map((r) => ({ id: r.id, ...r.data, isPublic: r.status === 'approved' }))} />}</>;
}
