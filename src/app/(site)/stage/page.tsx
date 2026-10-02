import type { Metadata } from 'next';
import Link from 'next/link';
import { listRecords } from '@/lib/records';
import { findArticle } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';

export const metadata: Metadata = { title: 'Una settimana in redazione', description: 'Gli studenti che hanno affiancato la redazione per una settimana, e il pezzo che hanno firmato.' };
export const dynamic = 'force-dynamic';
export default async function StagePage() {
  const [list, cats] = await Promise.all([listRecords<{ student: string; school: string; week: string; text: string; articleId: string; articleTitle: string }>('stage', { limit: 100 }), getCategories()]); const arts = new Map<string, string>(); for (const r of list) if (r.data.articleId) { const a = await findArticle(r.data.articleId); if (a && a.status === 'published') arts.set(r.id, articleUrlWith(a, cats)); }
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Una settimana in redazione</h1><p className="lead">Uno studente alla volta, per cinque giorni, siede con noi: segue le riunioni, esce con un cronista e firma un pezzo. Qui restano i loro nomi e i loro articoli.</p>{list.length === 0 && <p className="help">Il primo stage deve ancora cominciare.</p>}<ul className="trust-list">{list.map((r) => <li key={r.id}><time dateTime={r.data.week}>{new Date(r.data.week).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</time><div><b>{r.data.student}</b>{r.data.school && <span className="help"> · {r.data.school}</span>}{r.data.text && <p>{r.data.text}</p>}{arts.get(r.id) ? <Link href={arts.get(r.id)!}>{r.data.articleTitle}</Link> : r.data.articleTitle ? <span className="help">{r.data.articleTitle}</span> : null}</div></li>)}</ul></div></div>;
}
