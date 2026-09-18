import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listRecords } from '@/lib/records';
import { findArticle } from '@/lib/repo';
import { deleteRecordAction, moderateRecordAction } from '@/lib/actions-trust';
import { ActionButton } from '@/components/ui/action-button';
import { PARTICIPATION_KINDS } from '@/lib/participation';

export const dynamic = 'force-dynamic';
/** Moderazione unica per tutto ciò che i lettori mandano e che non è un commento: risposte lunghe, libro degli ospiti, bacheche… */
export default async function ParticipationPage() {
  const me = await requireUser(); if (!can(me, 'comment.moderate')) redirect('/admin');
  const groups = await Promise.all(PARTICIPATION_KINDS.map(async (k) => ({ k, pending: await listRecords<Record<string, string>>(k.kind, { status: 'pending', limit: 100 }) })));
  const thanks = await listRecords<{ text: string }>('thanks', { limit: 40 }); const titles = new Map<string, string>(); for (const id of new Set(thanks.map((t) => t.ref))) titles.set(id, (await findArticle(id))?.title ?? '');
  const total = groups.reduce((n, g) => n + g.pending.length, 0);
  return (
    <>
      <div className="page-title"><div><h1>Partecipazione</h1><p>Quello che i lettori mandano e che non è un commento. {total === 0 ? 'Niente da valutare.' : `${total} in attesa.`}</p></div></div>
      {groups.filter((g) => g.pending.length > 0).map(({ k, pending }) => <div className="panel" key={k.kind}><div className="panel-title">{k.label} ({pending.length})</div>{pending.map((r) => <div key={r.id} className="reply-item"><p><b>{r.data[k.who] || 'Anonimo'}</b>{r.data.email ? <> · <a href={`mailto:${r.data.email}`}>{r.data.email}</a></> : null}{r.data.title ? <> · «{r.data.title}»</> : null}{r.ref && r.data.articleTitle ? <> · su <Link href={`/admin/articoli/${r.ref}`}>{r.data.articleTitle}</Link></> : null}</p><blockquote>{String(r.data[k.body] ?? '').slice(0, 1600)}</blockquote><div style={{ display: 'flex', gap: 6 }}><ActionButton action={moderateRecordAction.bind(null, r.id, 'approved')}>Pubblica</ActionButton><ActionButton action={moderateRecordAction.bind(null, r.id, 'rejected')} className="btn btn-ghost btn-sm">Rifiuta</ActionButton><ActionButton action={deleteRecordAction.bind(null, r.id)} className="btn btn-ghost btn-sm">Elimina</ActionButton></div></div>)}</div>)}
      <div className="panel"><div className="panel-title">Grazie mirati ricevuti</div>{thanks.length === 0 ? <p className="help">Quando un lettore ringrazia per un passaggio preciso lo trovi qui.</p> : <ul className="due-list">{thanks.map((t) => <li key={t.id}><div>🙏 «{t.data.text}»<br /><Link className="help" href={`/admin/articoli/${t.ref}`}>{titles.get(t.ref)}</Link> <span className="help">· {new Date(t.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span></div></li>)}</ul>}</div>
    </>
  );
}
