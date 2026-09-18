import type { Metadata } from 'next';
import Link from 'next/link';
import { listRecords } from '@/lib/records';
import { predictionScore } from '@/lib/trust';
import { findArticle } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';

export const metadata: Metadata = { title: 'Archivio delle previsioni', description: 'Le previsioni pubblicate nei nostri articoli, con la data di verifica e com\'è andata davvero.' };
export const dynamic = 'force-dynamic';
type P = { text: string; who?: string; title?: string; outcome?: string; note?: string };
export default async function PredictionsPage() {
  const [all, cats] = await Promise.all([listRecords<P>('prediction', { limit: 300 }), getCategories()]); const score = predictionScore(all.filter((p) => p.status === 'done').map((p) => p.data.outcome ?? ''));
  const urls = new Map<string, string>(); for (const id of new Set(all.map((p) => p.ref))) { const a = await findArticle(id); if (a?.status === 'published' && !a.extra?.circle) urls.set(id, articleUrlWith(a, cats)); }
  const visible = all.filter((p) => urls.has(p.ref)); const open = visible.filter((p) => p.status !== 'done'), done = visible.filter((p) => p.status === 'done'); const mark: Record<string, string> = { right: '✔ avverata', partial: '≈ in parte', wrong: '✕ non avverata' };
  const Row = ({ p }: { p: (typeof all)[number] }) => <li><time dateTime={p.dueAt ?? ''}>{p.dueAt ? new Date(p.dueAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</time><div><p>{p.data.who ? <b>{p.data.who}: </b> : null}«{p.data.text}»{p.status === 'done' && <span className={`pred pred-${p.data.outcome}`}> {mark[p.data.outcome ?? '']}</span>}</p>{p.data.note && <p className="help">{p.data.note}</p>}<Link href={urls.get(p.ref)!}>{p.data.title ?? 'Leggi l\'articolo'}</Link></div></li>;
  return (
    <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Archivio delle previsioni</h1>
      <p className="lead">Politici, esperti e anche noi facciamo previsioni. Qui le conserviamo con una data di scadenza e poi andiamo a vedere com&apos;è andata.</p>
      {score.percent !== null && <p className="trust-score"><b>{score.percent}%</b> di previsioni azzeccate su {score.total} verificate ({score.right} giuste, {score.partial} in parte, {score.wrong} sbagliate).</p>}
      <h2>In attesa di verifica</h2>{open.length === 0 ? <p className="help">Nessuna previsione in attesa.</p> : <ul className="trust-list">{open.map((p) => <Row key={p.id} p={p} />)}</ul>}
      <h2>Verificate</h2>{done.length === 0 ? <p className="help">Ancora nessuna previsione arrivata a scadenza.</p> : <ul className="trust-list">{done.map((p) => <Row key={p.id} p={p} />)}</ul>}
    </div></div>
  );
}
