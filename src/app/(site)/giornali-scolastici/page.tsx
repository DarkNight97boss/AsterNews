import type { Metadata } from 'next';
import Link from 'next/link';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories, getSettings, getUsers } from '@/lib/queries';
import { listCards } from '@/lib/civic-data';

export const metadata: Metadata = { title: 'I giornali delle scuole', description: 'Ogni istituto ha la sua sezione, scritta dagli studenti con un tutor della redazione.' };
export const dynamic = 'force-dynamic';
export default async function SchoolPapersPage() {
  const [schools, arts, cats, users, s] = await Promise.all([listCards('scuola'), listArticles({ status: 'published', extraHas: 'school' }, 'published', 300), getCategories(), getUsers(), getSettings()]); const tutor = users.find((u) => u.id === s.access?.tutorUserId);
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>I giornali delle scuole</h1><p className="lead">{s.access?.schoolIntro || 'Ogni istituto ha una sezione tutta sua: la scrivono gli studenti, con un tutor della redazione che rilegge e consiglia.'}{tutor && <> Tutor: <b>{tutor.name}</b>.</>}</p>{schools.length === 0 && <p className="help">Nessuna scuola ha ancora una redazione.</p>}{schools.map((sc) => { const mine = arts.filter((a) => a.extra?.school === sc.id); return <section key={sc.id}><h2><Link href={`/schede/scuola/${sc.slug}`}>{sc.title}</Link> <span className="help">· {mine.length} {mine.length === 1 ? 'articolo' : 'articoli'}</span></h2>{mine.length === 0 ? <p className="help">Redazione appena nata: il primo articolo arriva presto.</p> : <ul className="trust-list">{mine.slice(0, 10).map((a) => <li key={a.id}><time dateTime={a.publishedAt ?? ''}>{new Date(a.publishedAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</time><div><Link href={articleUrlWith(a, cats)}>{a.title}</Link><p className="help">{a.byline || users.find((u) => u.id === a.authorId)?.name}</p></div></li>)}</ul>}</section>; })}</div></div>;
}
