import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { listArticles } from '@/lib/repo';
import { listRecords } from '@/lib/records';
import { dueSentences, ripeThemes, streak, type LiveDatum } from '@/lib/writing';
import { LiveDataManager, SeedBox, SessionTimer } from '@/components/admin/workshop';

export const dynamic = 'force-dynamic';
export default async function WorkshopPage({ searchParams }: PageProps<'/admin/officina'>) {
  const me = await requireUser(); const q = String((await searchParams).q ?? '').trim().toLowerCase(); const any = can(me, 'article.edit.any'); const now = new Date().toISOString();
  const [seedsR, sessions, data, graveyardAll, expiringAll, withData] = await Promise.all([listRecords<{ text: string; public?: boolean }>('seed', { owner: me.id }), listRecords<{ words: number; minutes: number; day: string }>('session', { owner: me.id, limit: 400 }), listRecords<LiveDatum>('datum', { order: 'old' }), listArticles({ extraHas: 'abandoned', includeCircles: true, ...(any ? {} : { authorId: me.id }) }, 'updated', 200), listArticles({ status: 'published', extraHas: 'expiring', includeCircles: true, ...(any ? {} : { authorId: me.id }) }, 'updated', 300), listArticles({ q: '{{dato:', includeCircles: true }, 'updated', 300)]);
  const seeds = seedsR.map((s) => ({ id: s.id, text: s.data.text, createdAt: s.createdAt, public: s.data.public })); const themes = ripeThemes(seeds).map((t) => ({ theme: t.theme, ids: t.notes.map((n) => n.id) }));
  const st = streak(sessions.map((s) => s.data.day), now.slice(0, 10)); const weekFrom = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10); const week = sessions.filter((s) => s.data.day >= weekFrom);
  const graveyard = graveyardAll.filter((a) => a.extra?.abandoned && (!q || `${a.title} ${a.extra.abandoned.why} ${a.content}`.toLowerCase().includes(q)));
  const expired = expiringAll.flatMap((a) => dueSentences(a.extra?.expiring, now).map((s) => ({ ...s, id: a.id, title: a.title })));
  const usage: Record<string, number> = {}; for (const a of withData) for (const m of new Set([...a.content.matchAll(/\{\{dato:([a-z0-9_-]+)\}\}/gi)].map((x) => x[1].toLowerCase()))) usage[m] = (usage[m] ?? 0) + 1;
  return (
    <>
      <div className="page-title"><div><h1>Officina</h1><p>Il retrobottega di chi scrive: appunti che maturano, sessioni, numeri vivi, frasi scadute e bozze messe da parte.</p></div></div>
      {expired.length > 0 && <div className="panel panel-warn"><div className="panel-title">Frasi scadute ({expired.length})</div><p className="help">Erano vere quando le hai scritte. Lo sono ancora?</p><ul className="due-list">{expired.map((s, i) => <li key={i}><div>«{s.text}» <span className="help">vera fino al {new Date(s.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span><br /><Link href={`/admin/articoli/${s.id}`}>{s.title}</Link></div></li>)}</ul></div>}
      <div className="admin-grid-2"><SeedBox seeds={seeds} themes={themes} /><SessionTimer current={st.current} best={st.best} weekWords={week.reduce((n, s) => n + s.data.words, 0)} weekMinutes={week.reduce((n, s) => n + s.data.minutes, 0)} /></div>
      {can(me, 'article.publish') && <LiveDataManager data={data.map((d) => d.data)} usage={usage} />}
      <div className="panel"><div className="panel-title">Cimitero delle bozze ({graveyard.length})</div>
        <form method="get" style={{ display: 'flex', gap: 6, marginBottom: 8 }}><input className="input" name="q" defaultValue={q} placeholder="Cerca per tema tra le idee lasciate" aria-label="Cerca nel cimitero delle bozze" /><button className="btn btn-outline btn-sm">Cerca</button></form>
        {graveyard.length === 0 ? <p className="help">Nessuna bozza messa da parte. Dall&apos;editor, «Mettere da parte» la porta qui con il motivo.</p> : <table className="table"><tbody>{graveyard.map((a) => <tr key={a.id}><td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title || 'Senza titolo'}</Link><div className="help">Lasciata perché: {a.extra!.abandoned!.why}</div></td><td className="help" style={{ whiteSpace: 'nowrap' }}>{new Date(a.extra!.abandoned!.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>)}</tbody></table>}
      </div>
    </>
  );
}
