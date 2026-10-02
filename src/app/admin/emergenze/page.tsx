import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listClosures, listDiary } from '@/lib/emergency-data';
import { getSettings } from '@/lib/queries';
import { countRecords, listRecords } from '@/lib/records';
import { AlertPanel, ChainsQueue, ClosuresAdmin, Diary, SmsPanel } from '@/components/admin/emergency-admin';

export const dynamic = 'force-dynamic';
export default async function EmergencyAdminPage() {
  const me = await requirePermission('article.publish'); const s = await getSettings(); const em = s.emergency ?? {};
  const [diary, closures, reports, chains, subs, sent] = await Promise.all([listDiary(em.active ? em.emergencyId : undefined, 100), listClosures(), listRecords<Record<string, string>>('chiusura-segnalata', { status: 'pending', limit: 50 }), listRecords<Record<string, string>>('catena', { status: 'pending', limit: 50 }), countRecords('sms-emergenza', { status: 'approved' }), listRecords<{ body: string; sent: number; failed: number }>('sms-sent', { limit: 10 })]);
  return <><div className="page-title"><div><h1>Sala emergenze</h1><p>Allerta, diario, chiusure, catene, SMS. Chi è di reperibilità lo decidi in Turni.</p></div></div><AlertPanel initial={{ active: !!em.active, title: em.title ?? '', text: em.text ?? '', level: em.level ?? 'rosso', since: em.since }} /><div className="admin-grid-2"><Diary list={diary} active={!!em.active} /><ClosuresAdmin list={closures} reports={reports.map((r) => ({ id: r.id, kind: r.data.kind, name: r.data.name, note: r.data.note ?? '' }))} /></div><div className="admin-grid-2"><ChainsQueue list={chains.map((r) => ({ id: r.id, text: r.data.text, where: r.data.where ?? '', createdAt: r.createdAt }))} /><SmsPanel configured={!!(em.sms?.sid && em.sms.token && em.sms.from)} subscribers={subs} siteName={s.siteName} canSettings={can(me, 'settings.manage')} sent={sent.map((r) => ({ ...r.data, at: r.createdAt }))} /></div></>;
}
