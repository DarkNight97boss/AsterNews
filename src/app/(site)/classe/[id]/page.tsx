import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findArticle } from '@/lib/repo';
import { articleUrl } from '@/lib/queries';
import { publicContent } from '@/lib/content-render';
import { classroomFallback } from '@/lib/school';
import { stripHtml } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false } };
/** Articolo in classe: versione da stampare con domande di comprensione e glossario per i docenti. */
export default async function ClassroomPage({ params }: PageProps<'/classe/[id]'>) {
  const a = await findArticle((await params).id); if (!a || a.status !== 'published' || a.extra?.circle || a.premium) notFound(); const html = await publicContent(a.content); const c = a.extra?.classroom?.questions?.length ? a.extra.classroom : classroomFallback(a.title, stripHtml(html)); const url = await articleUrl(a);
  return <div className="classroom"><p className="pe-hint">Versione per la classe: stampa (Ctrl/Cmd+P) o distribuisci il link. <a href={url}>Articolo originale</a></p><header><p className="kicker">Articolo in classe</p><h1>{a.title}</h1>{a.subtitle && <p className="lead">{a.subtitle}</p>}<p className="help">Pubblicato il {new Date(a.publishedAt!).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · {Math.max(1, Math.round(stripHtml(html).split(/\s+/).length / 150))} minuti di lettura</p></header><div className="article-body" dangerouslySetInnerHTML={{ __html: html }} /><section className="cls-box"><h2>Domande</h2><ol>{c.questions.map((q, i) => <li key={i}>{q}<div className="cls-lines" aria-hidden="true" /></li>)}</ol></section>{c.glossary.length > 0 && <section className="cls-box"><h2>Glossario</h2><dl>{c.glossary.map((g) => <div key={g.term}><dt>{g.term}</dt><dd>{g.meaning || <span className="cls-lines" aria-hidden="true" />}</dd></div>)}</dl></section>}</div>;
}
