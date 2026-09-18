import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { all } from '@/lib/db';
import { listArticles } from '@/lib/repo';
import { listRecords } from '@/lib/records';
import { meaningScore } from '@/lib/rhythm';

export const dynamic = 'force-dynamic';
/** Metriche di senso: letto fino in fondo, salvato, ringraziato, sottolineato, ha fatto cambiare idea, ha ricevuto risposte. Niente clic. */
export default async function MeaningPage() {
  const me = await requireUser(); if (!can(me, 'stats.view')) redirect('/admin'); const from = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [arts, ends, thanks, hl, mind, resp, saves] = await Promise.all([listArticles({ status: 'published', from, includeCircles: true, ...(can(me, 'article.edit.any') ? {} : { authorId: me.id }) }, 'published', 400), listRecords<{ n: number }>('read-end', { limit: 5000 }), listRecords('thanks', { limit: 5000 }), listRecords('highlight', { limit: 5000 }), listRecords<{ before: string; after: string }>('mind', { limit: 5000 }), listRecords('response', { status: 'approved', limit: 1000 }), all('SELECT article_id, COUNT(*) c FROM reader_bookmarks GROUP BY article_id') as Promise<{ article_id: string; c: number }[]>]);
  const cnt = (l: { ref: string }[], id: string) => l.filter((x) => x.ref === id).length;
  const rows = arts.map((a) => { const m = mind.filter((x) => x.ref === a.id); const input = { id: a.id, title: a.title, views: a.views, ends: ends.find((e) => e.ref === a.id)?.data.n ?? 0, saves: Number(saves.find((s) => s.article_id === a.id)?.c ?? 0), thanks: cnt(thanks, a.id), highlights: cnt(hl, a.id), mindChanged: m.filter((x) => x.data.before !== x.data.after).length, mindTotal: m.length, responses: cnt(resp, a.id) }; return { ...input, ...meaningScore(input) }; }).sort((a, b) => b.score - a.score);
  const pct = (n: number | null) => (n === null ? 'n.d.' : `${Math.round(n * 100)}%`);
  return (
    <>
      <div className="page-title"><div><h1>Metriche di senso</h1><p>Gli ultimi 90 giorni ordinati per quello che gli articoli hanno lasciato a chi li ha letti. Le visite qui non contano.</p></div><Link className="btn btn-outline" href="/admin/statistiche">Tutte le statistiche</Link></div>
      <div className="panel"><table className="table"><thead><tr><th>Articolo</th><th>Letto fino in fondo</th><th>Salvato</th><th>Grazie</th><th>Sottolineato</th><th>Ha cambiato idea</th><th>Risposte</th><th>Senso</th></tr></thead><tbody>{rows.slice(0, 60).map((r) => <tr key={r.id}><td className="t-title"><Link href={`/admin/articoli/${r.id}`}>{r.title}</Link></td><td>{pct(r.endRate)}</td><td>{r.saves}</td><td>{r.thanks}</td><td>{r.highlights}</td><td>{pct(r.mindRate)}</td><td>{r.responses}</td><td><b>{r.score}</b></td></tr>)}{rows.length === 0 && <tr><td colSpan={8} className="help">Nessun articolo negli ultimi 90 giorni.</td></tr>}</tbody></table><p className="help">«n.d.» quando i lettori sono troppo pochi per dire qualcosa di onesto (meno di 20 visite, meno di 5 risposte).</p></div>
    </>
  );
}
