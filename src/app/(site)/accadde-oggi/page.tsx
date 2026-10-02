import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/site/article-card';
import { sameDay } from '@/lib/archive';
import { listCards } from '@/lib/civic-data';
import { archiveMonths } from '@/lib/insights';
import { listArticles } from '@/lib/repo';

export const metadata: Metadata = { title: 'Accadde oggi', description: 'Cosa raccontava il giornale lo stesso giorno degli anni passati, e chi ricordiamo oggi.' };
export const dynamic = 'force-dynamic';
export default async function OnThisDay() {
  const now = new Date(); const mmdd = now.toISOString().slice(5, 10); const year = now.getFullYear();
  const years = [...new Set((await archiveMonths()).map((m) => m.month.slice(0, 4)))].filter((y) => Number(y) < year);
  const pool = (await Promise.all(years.map((y) => listArticles({ status: 'published', from: `${y}-${mmdd}T00:00:00.000Z`, to: `${y}-${mmdd}T23:59:59.999Z` }, 'views', 6)))).flat();
  const groups = sameDay(pool, mmdd, year); const people = (await listCards('persona')).filter((c) => (c.fields.nascita ?? '').slice(5) === mmdd || (c.fields.morte ?? '').slice(5) === mmdd);
  const today = now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><h1>Accadde oggi, {today}</h1><p className="lead">Lo stesso giorno, negli anni passati, qui.</p>{groups.length === 0 && <p className="help">Non abbiamo ancora un {today} negli anni passati. <Link href="/giornale?caso">Un giorno a caso</Link>.</p>}{groups.map((g) => <section key={g.year}><h2>{g.year} <span className="help">· {year - g.year} {year - g.year === 1 ? 'anno fa' : 'anni fa'}</span></h2><div className="list-divided">{g.items.map((a) => <ArticleCard key={a.id} article={a} variant="horizontal-sm" showMeta />)}</div><p className="help"><Link href={`/giornale/${g.year}-${mmdd}`}>La prima pagina intera di quel giorno</Link></p></section>)}{people.length > 0 && <section><h2>Chi ricordiamo oggi</h2><ul className="trust-list">{people.map((p) => <li key={p.id}><div><Link href={`/schede/persona/${p.slug}`}>{p.title}</Link><div className="help">{(p.fields.nascita ?? '').slice(5) === mmdd ? `nata/o il ${p.fields.nascita}` : `scomparsa/o il ${p.fields.morte}`}</div></div></li>)}</ul></section>}</div></div>;
}
