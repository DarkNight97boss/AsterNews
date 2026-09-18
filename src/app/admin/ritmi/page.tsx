import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings, getUsers } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { listRecords } from '@/lib/records';
import { articleEconomics, workload } from '@/lib/rhythm';
import { EmergencyForm, NoMetricsToggle, RhythmForm } from '@/components/admin/rhythm-admin';

export const dynamic = 'force-dynamic';
export default async function RhythmPage() {
  const me = await requireUser(); const lead = can(me, 'article.assign'); const admin = can(me, 'settings.manage'); const now = new Date(); const soon = new Date(+now + 3 * 86_400_000).toISOString(); const week = new Date(+now - 7 * 86_400_000).toISOString();
  const [s, users, open, recent, handoffs, costed] = await Promise.all([getSettings(), getUsers(), listArticles({ status: ['draft', 'review'], includeCircles: true }, 'updated', 1000), listArticles({ status: 'published', from: week, includeCircles: true }, 'published', 1000), listRecords('handoff', { limit: 500 }), listArticles({ status: 'published', extraHas: 'cost', includeCircles: true }, 'published', 200)]);
  const r = s.rhythm ?? {}; const active = open.filter((a) => !a.extra?.abandoned); const mine = (id: string) => active.filter((a) => (a.assignedTo || a.authorId) === id);
  const load = workload(users.filter((u) => u.active !== false).map((u) => { const l = mine(u.id); return { userId: u.id, name: u.name, openDrafts: l.length, dueSoon: l.filter((a) => a.deadline && a.deadline > now.toISOString() && a.deadline <= soon).length, overdue: l.filter((a) => a.deadline && a.deadline < now.toISOString()).length, publishedWeek: recent.filter((a) => a.authorId === u.id).length, handoffs: handoffs.filter((h) => h.owner === u.id && h.createdAt >= week).length }; }), r.maxOpen || 6).filter((u) => lead || u.userId === me.id);
  const rates = { hourlyRate: r.hourlyRate ?? 0, rpm: r.rpm ?? 0, subscriptionValue: r.subscriptionValue ?? 0 }; const eco = costed.filter((a) => a.extra?.cost && (lead || a.authorId === me.id)).map((a) => ({ a, e: articleEconomics({ hours: a.extra!.cost!.hours ?? 0, expenses: a.extra!.cost!.expenses ?? 0, views: a.views, subscriptions: 0, sourceShare: a.extra!.cost!.sourceShare }, rates) })).sort((x, y) => x.e.margin - y.e.margin);
  const money = (n: number) => `${n.toFixed(2).replace('.', ',')} €`; const shared = costed.filter((a) => a.extra?.cost?.sourceName && (a.extra.cost.sourceShare ?? 0) > 0);
  return (
    <>
      <div className="page-title"><div><h1>Ritmi di lavoro</h1><p>Un giornale dura se chi lo fa regge. Qui si guarda il carico delle persone, il costo vero dei pezzi e il diritto a staccare.</p></div></div>
      <div className="admin-grid-2"><NoMetricsToggle />{can(me, 'article.publish') ? <EmergencyForm /> : <div />}</div>
      <div className="panel"><div className="panel-title">Carico di lavoro{lead ? '' : ' (il tuo)'}</div><table className="table"><thead><tr><th>Persona</th><th>Aperti</th><th>Scadenze</th><th>Usciti in 7 gg</th><th></th></tr></thead><tbody>{load.map((u) => <tr key={u.userId} className={`load-${u.level}`}><td className="t-title">{u.name}</td><td>{u.openDrafts}</td><td>{u.dueSoon} vicine{u.overdue ? `, ${u.overdue} passate` : ''}</td><td>{u.publishedWeek}</td><td>{u.level === 'ok' ? <span className="help">nella norma</span> : <><b>{u.level === 'troppo' ? '⚠︎ troppo' : 'pieno'}</b><div className="help">{u.reasons.join(' · ')}</div></>}</td></tr>)}</tbody></table><p className="help">Non è una classifica: serve a chi assegna i pezzi per non darli sempre alla stessa persona.</p></div>
      <div className="panel"><div className="panel-title">Costo reale degli articoli</div>{!rates.hourlyRate ? <p className="help">Imposta qui sotto il costo di un&apos;ora di lavoro; poi, nell&apos;editor, segna ore e spese dei pezzi che vuoi misurare.</p> : eco.length === 0 ? <p className="help">Nessun articolo con ore e spese segnate. Si compilano nell&apos;editor, pannello «Quanto è costato».</p> : <table className="table"><thead><tr><th>Articolo</th><th>Costo</th><th>Ricavo stimato</th><th>Margine</th><th>Per lettore</th></tr></thead><tbody>{eco.slice(0, 40).map(({ a, e }) => <tr key={a.id}><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link><div className="help">{a.extra!.cost!.hours ?? 0} ore · {a.views} visite</div></td><td>{money(e.cost)}</td><td>{money(e.revenue)}</td><td style={{ color: e.margin < 0 ? '#c62828' : '#2e7d32' }}>{money(e.margin)}</td><td>{e.perReader === null ? 'n.d.' : money(e.perReader)}</td></tr>)}</tbody></table>}<p className="help">Un margine negativo non vuol dire «non farlo più»: un&apos;inchiesta costa e rende in fiducia. Serve a saperlo, non a deciderlo al posto tuo.</p></div>
      {shared.length > 0 && <div className="panel"><div className="panel-title">Ricavi condivisi con le fonti della comunità</div><table className="table"><tbody>{shared.map((a) => <tr key={a.id}><td className="t-title">{a.extra!.cost!.sourceName}<div className="help"><Link href={`/admin/articoli/${a.id}`}>{a.title}</Link></div></td><td>{a.extra!.cost!.sourceShare}% degli abbonamenti nati dal pezzo</td></tr>)}</tbody></table><p className="help">Quando un contributo di un lettore porta abbonamenti, una quota gli torna indietro. La percentuale si decide nell&apos;editor, il conto si fa a fine mese sugli abbonamenti attribuiti.</p></div>}
      {admin && <RhythmForm initial={r} />}
    </>
  );
}
