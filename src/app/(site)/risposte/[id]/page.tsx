import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findRecord } from '@/lib/records';
import { findArticle } from '@/lib/repo';
import { articleUrl } from '@/lib/queries';

type D = { name: string; title: string; text: string };
async function load(id: string) { const r = await findRecord<D>(id); if (!r || r.kind !== 'response' || r.status !== 'approved') return null; const a = await findArticle(r.ref); if (!a || a.status !== 'published' || a.extra?.circle) return null; return { r, a }; }
export async function generateMetadata({ params }: PageProps<'/risposte/[id]'>): Promise<Metadata> { const x = await load((await params).id); return x ? { title: `${x.r.data.title} · risposta di ${x.r.data.name}`, description: x.r.data.text.slice(0, 150) } : {}; }
export default async function ResponsePage({ params }: PageProps<'/risposte/[id]'>) {
  const x = await load((await params).id); if (!x) notFound(); const url = await articleUrl(x.a);
  return <div className="account" style={{ maxWidth: 720 }}><article className="account-card trust-page long-response-page"><p className="kicker">La risposta di un lettore a <Link href={url}>{x.a.title}</Link></p><h1>{x.r.data.title}</h1><p className="help">di {x.r.data.name} · {new Date(x.r.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>{x.r.data.text.split(/\n{2,}|\n/).filter(Boolean).map((p, i) => <p key={i} className="lr-p">{p}</p>)}<p className="help">Le risposte dei lettori esprimono il punto di vista di chi le firma. <Link href={url}>Torna all&apos;articolo</Link></p></article></div>;
}
