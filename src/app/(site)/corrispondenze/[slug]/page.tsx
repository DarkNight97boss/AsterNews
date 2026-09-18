import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { personalLists } from '@/lib/actions-personal';
import { getSettings } from '@/lib/queries';

export const dynamic = 'force-dynamic';
const load = async (slug: string) => (await personalLists()).letters.find((c) => c.data.slug === slug);
export async function generateMetadata({ params }: PageProps<'/corrispondenze/[slug]'>): Promise<Metadata> { const c = await load((await params).slug); return c ? { title: c.data.title, description: c.data.intro } : {}; }
export default async function LettersPage({ params }: PageProps<'/corrispondenze/[slug]'>) {
  const c = await load((await params).slug); if (!c) notFound(); const s = await getSettings();
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page letters-page"><p className="kicker"><Link href="/corrispondenze">Corrispondenze</Link></p><h1>{c.data.title}</h1><p className="lead">{c.data.intro}</p><p className="help">Uno scambio con {c.data.withUrl ? <a href={c.data.withUrl} rel="noopener" target="_blank">{c.data.withName}</a> : c.data.withName}</p>{c.data.letters.map((l, i) => <article key={i} className={`letter letter-${l.from}`}><header><b>{l.from === 'me' ? s.siteName : c.data.withName}</b>{l.date && <time dateTime={l.date}>{new Date(l.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</time>}</header>{l.text.split(/\n{2,}|\n/).filter(Boolean).map((p, k) => <p key={k}>{p}</p>)}{l.url && <p className="help"><a href={l.url} rel="noopener" target="_blank">Pubblicata in origine qui</a></p>}</article>)}</div></div>;
}
