import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { metaGet } from '@/lib/db';
import { can } from '@/lib/permissions';
import { getCategories, getSettings, getUsers } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { STATUS_LABELS } from '@/lib/models';
import { RundownTools } from '@/components/admin/rundown-tools';

export const dynamic = 'force-dynamic';
const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
/** Scaletta di riunione: gli articoli del giorno con stato, responsabile e orario, più gli appunti della riunione. Stampabile. */
export default async function RundownPage({ searchParams }: PageProps<'/admin/scaletta'>) {
  const me = await requireUser(); const sp = await searchParams; const day = typeof sp.giorno === 'string' && valid(sp.giorno) ? sp.giorno : new Date().toISOString().slice(0, 10);
  const [all, cats, users, notes, s] = await Promise.all([listArticles({}, 'updated', 400), getCategories(), getUsers(), metaGet(`rundown_${day}`), getSettings()]);
  const onDay = (iso: string | null | undefined) => (iso ?? '').slice(0, 10) === day;
  const rows = all.filter((a) => onDay(a.scheduledAt) || onDay(a.publishedAt) || onDay(a.deadline ?? null) || (['draft', 'review'].includes(a.status) && onDay(a.updatedAt)));
  const order = { review: 0, draft: 1, scheduled: 2, published: 3, archived: 4 } as Record<string, number>; rows.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.scheduledAt ?? a.deadline ?? a.updatedAt).localeCompare(b.scheduledAt ?? b.deadline ?? b.updatedAt));
  const shift = (n: number) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const time = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '—');
  const b = s.briefing ?? { enabled: false, hour: 6, feeds: '', count: 5 };
  return (
    <div className="rundown">
      <div className="page-title"><div><h1>Scaletta del {new Date(day + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</h1><p>{rows.length} pezzi tra in lavorazione, programmati e pubblicati. Per la riunione di redazione: si stampa pulita.</p></div><div className="actions noprint"><Link className="btn btn-ghost" href={`/admin/scaletta?giorno=${shift(-1)}`}>← Ieri</Link><Link className="btn btn-ghost" href={`/admin/scaletta?giorno=${shift(1)}`}>Domani →</Link></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Ora</th><th>Titolo</th><th>Sezione</th><th>Responsabile</th><th>Stato</th><th>Note</th></tr></thead><tbody>
        {rows.map((a) => <tr key={a.id}><td style={{ whiteSpace: 'nowrap' }}>{time(a.scheduledAt ?? (a.status === 'published' ? a.publishedAt : a.deadline))}</td><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link>{a.extra?.embargoUntil && a.extra.embargoUntil > new Date().toISOString() && <span className="badge badge-red" style={{ marginLeft: 6 }}>embargo fino alle {time(a.extra.embargoUntil)}</span>}</td><td>{cats.find((c) => c.id === a.categoryId)?.name}</td><td>{users.find((u) => u.id === (a.assignedTo || a.authorId))?.name}</td><td>{STATUS_LABELS[a.status]}{a.breaking ? ' · ultim\'ora' : ''}{a.featured ? ' · in evidenza' : ''}</td><td className="help">{a.extra?.template === 'rassegna' ? 'dalla rassegna: da valutare' : a.format !== 'standard' ? a.format : ''}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={6} className="help">Nessun pezzo per questa giornata.</td></tr>}
      </tbody></table></div>
      <RundownTools day={day} notes={notes ?? ''} canRun={can(me, 'article.publish')} canConfig={can(me, 'settings.manage')} briefing={b} />
    </div>
  );
}
