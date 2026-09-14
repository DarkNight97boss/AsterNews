import { redirect } from 'next/navigation';
import { ActionButton } from '@/components/ui/action-button';
import { removeSubscriberAction } from '@/lib/actions';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSubscribers } from '@/lib/queries';
import { formatDate } from '@/lib/utils';

export default async function NewsletterPage() {
  const me = await requireUser();
  if (!can(me, 'comment.moderate')) redirect('/admin');
  const subs = await getSubscribers();
  const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent('email,data\n' + subs.map((s) => `${s.email},${s.createdAt}`).join('\n'));
  return (
    <>
      <div className="page-title"><div><h1>Newsletter</h1><p>{subs.length} iscritti</p></div><div className="actions"><a className="btn btn-outline" href={csv} download="iscritti.csv">Esporta CSV</a></div></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Email</th><th>Iscritto il</th><th></th></tr></thead>
        <tbody>
          {subs.map((s) => <tr key={s.id}><td><b>{s.email}</b></td><td>{formatDate(s.createdAt)}</td><td><div className="t-actions"><ActionButton className="icon-btn danger" action={removeSubscriberAction.bind(null, s.id)}>🗑</ActionButton></div></td></tr>)}
          {subs.length === 0 && <tr><td colSpan={3}><div className="empty"><h3>Nessun iscritto</h3></div></td></tr>}
        </tbody></table></div>
    </>
  );
}
