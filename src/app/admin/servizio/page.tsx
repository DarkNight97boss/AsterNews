import Link from 'next/link';
import { requirePermission } from '@/lib/auth';
import { countRecords, listRecords } from '@/lib/records';
import { guidesDue, listDeadlines } from '@/lib/service-data';
import { Deadlines, QuestionsQueue } from '@/components/admin/service-admin';

export const dynamic = 'force-dynamic';
export default async function ServiceAdminPage() {
  await requirePermission('article.publish');
  const [questions, deadlines, subs, waiting, guides] = await Promise.all([listRecords<Record<string, string>>('domanda', { status: 'pending', limit: 100 }), listDeadlines(), countRecords('promemoria', { status: 'approved' }), countRecords('waitlist', { status: 'approved' }), guidesDue()]);
  return <><div className="page-title"><div><h1>Servizio ai lettori</h1><p>Domande da rispondere, scadenze da ricordare, guide da riverificare. {waiting} {waiting === 1 ? 'persona aspetta' : 'persone aspettano'} il seguito di una storia.</p></div></div><div className="admin-grid-2"><QuestionsQueue list={questions.map((q) => ({ id: q.id, name: q.data.name, text: q.data.text, createdAt: q.createdAt }))} /><Deadlines list={deadlines} subscribers={subs} /></div><div className="panel"><div className="panel-title">Guide da riverificare ({guides.length})</div>{guides.length === 0 ? <p className="help">Tutte le guide sono verificate di recente.</p> : <table className="table"><tbody>{guides.map(({ article: a, status }) => <tr key={a.id}><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link></td><td className={status.state === 'stale' ? 'error-text' : ''}>{status.state === 'never' ? 'mai verificata' : `${status.days} giorni dall'ultima verifica`}</td></tr>)}</tbody></table>}</div></>;
}
