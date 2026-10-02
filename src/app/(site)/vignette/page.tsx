import type { Metadata } from 'next';
import Link from 'next/link';
import { listVignette } from '@/lib/formats-data';
import { findArticle } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';

export const metadata: Metadata = { title: 'La vignetta', description: 'Una vignetta alla settimana su una notizia della città, disegnata da una persona.' };
export const dynamic = 'force-dynamic';
export default async function CartoonsPage() { const [list, cats] = await Promise.all([listVignette(), getCategories()]); const links = new Map<string, { url: string; title: string }>(); for (const v of list) if (v.data.articleId && !links.has(v.data.articleId)) { const a = await findArticle(v.data.articleId); if (a && a.status === 'published') links.set(v.data.articleId, { url: articleUrlWith(a, cats), title: a.title }); } return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>La vignetta</h1><p className="lead">Una alla settimana, su un fatto della città. Disegnata da una persona: lo diciamo perché oggi non è scontato.</p>{list.length === 0 && <p className="help">Nessuna vignetta ancora.</p>}{list.map((v) => <figure key={v.id} className="vignetta"><img src={v.data.image} alt={v.data.caption} loading="lazy" /><figcaption><b>{v.data.caption}</b><span>{v.data.author ? `di ${v.data.author} · ` : ''}{new Date(v.createdAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}{links.get(v.data.articleId) && <> · <Link href={links.get(v.data.articleId)!.url}>{links.get(v.data.articleId)!.title}</Link></>}</span></figcaption></figure>)}</div></div>; }
