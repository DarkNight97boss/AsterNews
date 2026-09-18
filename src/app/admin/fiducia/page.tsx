import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings, getUsers } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { listRecords } from '@/lib/records';
import { isAbandoned } from '@/lib/trust';
import { deleteRecordAction, moderateRecordAction } from '@/lib/actions-trust';
import { ActionButton } from '@/components/ui/action-button';
import { SettleForm, TrustSettingsForm } from '@/components/admin/trust-admin';

export const dynamic = 'force-dynamic';
type C = { text: string; who?: string; title?: string };
export default async function TrustAdminPage() {
  const me = await requireUser(); const now = Date.now(); const soon = new Date(now + 7 * 86_400_000).toISOString();
  const [s, users, replies, promises, predictions, open1, open2] = await Promise.all([getSettings(), getUsers(), listRecords<{ name: string; role: string; email: string; text: string; title: string }>('reply', { status: 'pending' }), listRecords<C>('promise', { status: 'open', order: 'due' }), listRecords<C>('prediction', { status: 'open', order: 'due' }), listArticles({ status: 'published', extraHas: 'verification', includeCircles: true }, 'updated', 200), listArticles({ status: 'published', extraHas: 'openQuestions', includeCircles: true }, 'updated', 200)]);
  const abandoned = [...new Map([...open1, ...open2].map((a) => [a.id, a])).values()].filter((a) => isAbandoned(a, now)).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : ''); const canMod = can(me, 'comment.moderate');
  const Due = ({ list, kind }: { list: typeof promises; kind: 'promise' | 'prediction' }) => list.length === 0 ? <p className="help">Niente in sospeso.</p> : <ul className="due-list">{list.map((p) => <li key={p.id} className={p.dueAt && p.dueAt <= soon ? 'due-now' : ''}><div><b>{day(p.dueAt)}</b> · {p.data.who ? `${p.data.who}: ` : ''}{p.data.text}<br /><Link className="help" href={`/admin/articoli/${p.ref}`}>{p.data.title ?? 'Apri l\'articolo'}</Link></div><SettleForm id={p.id} kind={kind} /></li>)}</ul>;
  return (
    <>
      <div className="page-title"><div><h1>Fiducia e trasparenza</h1><p>Repliche da valutare, promesse e previsioni in scadenza, storie lasciate a metà. Le pagine pubbliche: <Link href="/trasparenza" target="_blank">Trasparenza</Link>, <Link href="/correzioni" target="_blank">Correzioni</Link>, <Link href="/previsioni" target="_blank">Previsioni</Link>, <Link href="/domande-aperte" target="_blank">Domande aperte</Link>.</p></div></div>
      <div className="panel"><div className="panel-title">Richieste di replica ({replies.length})</div>{replies.length === 0 ? <p className="help">Nessuna richiesta in attesa.</p> : replies.map((r) => <div key={r.id} className="reply-item"><p><b>{r.data.name}</b>{r.data.role ? `, ${r.data.role}` : ''} · <a href={`mailto:${r.data.email}`}>{r.data.email}</a> · su <Link href={`/admin/articoli/${r.ref}`}>{r.data.title}</Link></p><blockquote>{r.data.text}</blockquote>{canMod && <div style={{ display: 'flex', gap: 6 }}><ActionButton action={moderateRecordAction.bind(null, r.id, 'approved')}>Pubblica sotto l&apos;articolo</ActionButton><ActionButton action={moderateRecordAction.bind(null, r.id, 'rejected')} className="btn btn-ghost btn-sm">Rifiuta</ActionButton><ActionButton action={deleteRecordAction.bind(null, r.id)} className="btn btn-ghost btn-sm">Elimina</ActionButton></div>}</div>)}</div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Promesse ai lettori</div><Due list={promises} kind="promise" /></div>
        <div className="panel"><div className="panel-title">Previsioni da verificare</div><Due list={predictions} kind="prediction" /></div>
      </div>
      <div className="panel"><div className="panel-title">Storie lasciate a metà ({abandoned.length})</div><p className="help">Articoli pubblicati come «in evoluzione», «non verificato» o con domande aperte, fermi da più di 30 giorni.</p>{abandoned.length === 0 ? <p className="help">Nessuna: tutto ciò che è aperto è stato toccato di recente.</p> : <table className="table"><tbody>{abandoned.map((a) => <tr key={a.id}><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link></td><td className="help">{users.find((u) => u.id === a.authorId)?.name ?? ''}</td><td className="help">fermo dal {day(a.updatedAt)}</td></tr>)}</tbody></table>}</div>
      {can(me, 'settings.manage') && <TrustSettingsForm initial={s.trust ?? {}} users={users.filter((u) => u.active !== false).map((u) => ({ id: u.id, name: u.name }))} />}
    </>
  );
}
