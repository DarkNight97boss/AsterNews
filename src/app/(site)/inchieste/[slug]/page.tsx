import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listFunds } from '@/lib/economy-data';
import { fundProgress, marker } from '@/lib/economy';
import { findArticle } from '@/lib/repo';
import { articleUrl } from '@/lib/queries';

export const dynamic = 'force-dynamic';
const load = async (slug: string) => (await listFunds()).find((f) => f.slug === slug);
export async function generateMetadata({ params }: PageProps<'/inchieste/[slug]'>): Promise<Metadata> { const f = await load((await params).slug); return f ? { title: f.title, description: f.intro.slice(0, 160) } : {}; }
export default async function FundPage({ params }: PageProps<'/inchieste/[slug]'>) {
  const f = await load((await params).slug); if (!f) notFound(); const p = fundProgress(f.goal, f.raised); const art = f.articleId ? await findArticle(f.articleId) : null; const url = art && art.status === 'published' ? await articleUrl(art) : '';
  return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><p className="kicker"><Link href="/inchieste">Inchieste finanziate dai lettori</Link></p><h1>{f.title}</h1><p className="lead">{f.intro}</p><div className="funding-bar" style={{ height: 14 }}><span style={{ width: `${p.percent}%` }} /></div><p className="trust-score"><b>{f.raised.toLocaleString('it-IT')} €</b> raccolti su {f.goal.toLocaleString('it-IT')} € · {f.donors} donatori{p.done ? ' · obiettivo raggiunto' : ` · mancano ${p.left.toLocaleString('it-IT')} €`}</p>{f.status === 'open' && <p><Link className="btn btn-primary" href={`/sostieni?importo=10&messaggio=${encodeURIComponent(marker('inchiesta', f.slug))}`}>Finanzia questa inchiesta</Link></p>}{url && <p><b>L&apos;inchiesta è uscita:</b> <Link href={url}>{art!.title}</Link></p>}{f.updates && <section><h2>Aggiornamenti</h2><div style={{ whiteSpace: 'pre-line' }}>{f.updates}</div></section>}{f.expenses && <section><h2>Dove sono andati i soldi</h2><div style={{ whiteSpace: 'pre-line' }}>{f.expenses}</div></section>}</div></div>;
}
