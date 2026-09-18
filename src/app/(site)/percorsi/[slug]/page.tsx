import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allPaths } from '@/lib/paths-data';
import { findArticle } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';
import { readingTime } from '@/lib/utils';
import { PathProgress } from '@/components/site/path-progress';

export const dynamic = 'force-dynamic';
const load = async (slug: string) => (await allPaths()).find((p) => p.data.slug === slug);
export async function generateMetadata({ params }: PageProps<'/percorsi/[slug]'>): Promise<Metadata> { const p = await load((await params).slug); return p ? { title: p.data.title, description: p.data.intro } : {}; }
export default async function PathPage({ params }: PageProps<'/percorsi/[slug]'>) {
  const p = await load((await params).slug); if (!p) notFound(); const cats = await getCategories();
  const steps = (await Promise.all(p.data.steps.map(async (s) => { const a = await findArticle(s.articleId); return a && a.status === 'published' && !a.extra?.circle ? { id: a.id, url: articleUrlWith(a, cats), title: a.title, note: s.note, minutes: readingTime(a.content) } : null; }))).filter((x): x is NonNullable<typeof x> => !!x);
  return <div className="account" style={{ maxWidth: 720 }}><div className="account-card trust-page"><p className="kicker"><Link href="/percorsi">Percorsi di lettura</Link></p><h1>{p.data.title}</h1><p className="lead">{p.data.intro}</p><p className="help">{steps.length} tappe · circa {steps.reduce((n, s) => n + s.minutes, 0)} minuti in tutto</p><PathProgress slug={p.data.slug} steps={steps} /></div></div>;
}
