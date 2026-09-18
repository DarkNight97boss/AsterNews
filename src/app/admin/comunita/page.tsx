import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { countRecords, listRecords } from '@/lib/records';
import { slugify } from '@/lib/utils';
import { CommonsForm, CouncilRow, RoundsManager, RowButton } from '@/components/admin/commons-admin';

export const dynamic = 'force-dynamic';
type D = Record<string, string>;
export default async function CommonsAdminPage({ searchParams }: PageProps<'/admin/comunita'>) {
  const me = await requireUser(); if (!can(me, 'comment.moderate')) redirect('/admin'); const admin = can(me, 'settings.manage'); const q = String((await searchParams).competenza ?? '').toLowerCase();
  const [s, rounds, council, logs, requests, skills, topics, pending] = await Promise.all([getSettings(), listRecords<{ title: string; intro: string; options: { id: string; title: string; desc: string }[]; subscribersOnly?: boolean }>('assembly', { limit: 24 }), listRecords<D>('council', { status: 'approved', order: 'old' }), listRecords<D>('log', { status: 'approved', limit: 40 }), listRecords<D>('suspended-request', { status: 'pending' }), listRecords<D>('skill', { status: 'approved', limit: 1000 }), listRecords<D>('listen-topic', { status: 'pending', limit: 30 }), Promise.all(['log', 'council', 'board', 'photo', 'memory', 'translation', 'skill'].map((k) => countRecords(k, { status: 'pending' })))]);
  const votes = await Promise.all(rounds.map((r) => countRecords('vote', { ref: r.id }))); const found = skills.filter((k) => !q || `${k.data.field} ${k.data.about}`.toLowerCase().includes(q)); const waiting = pending.reduce((n, k) => n + k, 0);
  return (
    <>
      <div className="page-title"><div><h1>Comunità</h1><p>Assemblea, domande al Comune, taccuino, banca delle competenze, abbonamenti sospesi. {waiting > 0 ? <Link href="/admin/partecipazione"><b>{waiting} contributi da moderare</b></Link> : 'Nessun contributo in attesa.'}</p></div></div>
      <div className="admin-grid-2">
        {admin ? <RoundsManager rounds={rounds.map((r, i) => ({ id: r.id, votes: votes[i], data: { ...r.data, closesAt: r.dueAt ?? '', subscribersOnly: !!r.data.subscribersOnly, open: r.status === 'open' } }))} /> : <div />}
        <div className="panel"><div className="panel-title">Domande al Comune in coda ({council.length})</div>{council.length === 0 && <p className="help">Nessuna domanda approvata in attesa di risposta.</p>}{council.map((c) => <CouncilRow key={c.id} id={c.id} text={c.data.text} sentAt={c.data.sentAt} answer={c.data.answer} />)}</div>
      </div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Taccuino: verifica a campione</div>{logs.length === 0 && <p className="help">Nessuna voce pubblicata.</p>}{logs.map((l) => <div key={l.id} className="reply-item"><p><b>{l.data.what}</b> · {l.data.where} {l.data.verified && '✔'}</p><p className="help">{l.data.text}</p><RowButton id={l.id} action="verify" label={l.data.verified ? 'Togli la verifica' : 'Sono stato sul posto: è vero'} /></div>)}</div>
        <div className="panel"><div className="panel-title">Abbonamenti sospesi ({s.commons?.suspendedPool ?? 0} disponibili)</div>{requests.length === 0 && <p className="help">Nessuna richiesta.</p>}{requests.map((r) => <div key={r.id} className="reply-item"><p>{r.data.email} <span className="help">· {new Date(r.createdAt).toLocaleDateString('it-IT')}</span></p>{r.data.note && <p className="help">{r.data.note}</p>}{admin && <RowButton id={r.id} action="grant" label="Assegna un abbonamento sospeso" />}</div>)}
          <div className="panel-title" style={{ marginTop: 16 }}>Temi proposti per l&apos;ora di ascolto</div>{topics.length === 0 ? <p className="help">Nessuna proposta.</p> : <ul>{topics.map((t) => <li key={t.id}>{t.data.text} <span className="help">{t.data.name}</span></li>)}</ul>}</div>
      </div>
      <div className="panel"><div className="panel-title">Banca delle competenze ({skills.length})</div><form method="get" style={{ display: 'flex', gap: 6, marginBottom: 8 }}><input className="input" name="competenza" defaultValue={q} placeholder="Cerca: idraulico, diritto del lavoro, pediatria…" aria-label="Cerca una competenza" /><button className="btn btn-outline btn-sm">Cerca</button></form>{found.length === 0 ? <p className="help">Nessun lettore con questa competenza (le nuove disponibilità si accettano da Partecipazione).</p> : <table className="table"><tbody>{found.slice(0, 60).map((k) => <tr key={k.id}><td className="t-title">{k.data.field}<div className="help">{k.data.about}</div></td><td>{k.data.name}</td><td><a href={`mailto:${k.data.email}`}>{k.data.email}</a></td></tr>)}</tbody></table>}</div>
      {admin && <CommonsForm initial={s.commons ?? {}} siteSlug={slugify(s.siteName)} />}
    </>
  );
}
