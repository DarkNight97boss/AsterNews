import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentReader } from '@/lib/auth';
import { articleUrlWith, getCategories, tagsByIds } from '@/lib/queries';
import { listRecords } from '@/lib/records';
import { findArticle } from '@/lib/repo';
import { readingDiary } from '@/lib/service';

export const metadata: Metadata = { title: 'Il diario delle letture', robots: { index: false } };
export const dynamic = 'force-dynamic';
export default async function DiaryPage() {
  const reader = await getCurrentReader(); if (!reader) redirect('/account?redirect=/account/diario');
  const reads = await listRecords('read', { owner: reader.id, limit: 2000 }); const arts = new Map<string, import('@/lib/models').Article>(); for (const r of reads) if (!arts.has(r.ref)) { const a = await findArticle(r.ref); if (a) arts.set(r.ref, a); }
  const d = readingDiary(reads.map((r) => ({ articleId: r.ref, createdAt: r.createdAt })), new Map([...arts].map(([id, a]) => [id, { title: a.title, tagIds: a.tagIds, categoryId: a.categoryId }]))); const [tags, cats] = await Promise.all([tagsByIds(d.topTags.map((t) => t.id)), getCategories()]);
  return <><div className="page-head"><span className="kicker">Il mio account</span><h1>Il diario delle letture</h1><p>{d.total} articoli letti fino in fondo. Lo vedi solo tu. <Link href="/account/per-te">Per te</Link> · <Link href="/account/salvati">Salvati</Link> · <a href="/api/export/diario">Scarica in CSV</a></p></div>{d.topTags.length > 0 && <p className="chips">Gli argomenti che leggi di più: {d.topTags.map((t) => { const tg = tags.find((x) => x.id === t.id); return tg ? <Link key={t.id} className="chip" href={`/tag/${tg.slug}`}>{tg.name} · {t.n}</Link> : null; })}</p>}{d.months.length === 0 && <p className="help">Ancora vuoto: si riempie quando leggi un articolo fino alla fine.</p>}{d.months.map((m) => <section key={m.month} className="section"><div className="section-title"><h2>{new Date(`${m.month}-01T12:00:00Z`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2><span className="count">{m.n}</span></div><ul className="archive-list" style={{ gridTemplateColumns: '1fr' }}>{m.items.map((it) => { const a = arts.get(it.articleId)!; return <li key={it.articleId + it.at} style={{ textTransform: 'none' }}><Link href={articleUrlWith(a, cats)}>{it.title}</Link><span className="help">{new Date(it.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span></li>; })}</ul></section>)}</>;
}
