import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findRecord } from '@/lib/records';
import { findArticle } from '@/lib/repo';
import { articleUrl } from '@/lib/queries';

async function load(id: string) { const r = await findRecord<Record<string, string>>(id); if (!r || r.kind !== 'translation' || r.status !== 'approved') return null; const a = await findArticle(r.ref); return a && a.status === 'published' && !a.extra?.circle ? { r, a } : null; }
export async function generateMetadata({ params }: PageProps<'/traduzioni/[id]'>): Promise<Metadata> { const x = await load((await params).id); return x ? { title: x.r.data.title, description: x.r.data.text.slice(0, 150) } : {}; }
export default async function TranslationPage({ params }: PageProps<'/traduzioni/[id]'>) {
  const x = await load((await params).id); if (!x) notFound(); const url = await articleUrl(x.a); const rtl = x.r.data.lang === 'العربية';
  return <div className="account" style={{ maxWidth: 720 }}><article className="account-card trust-page long-response-page" dir={rtl ? 'rtl' : undefined}><p className="kicker" dir="ltr">{x.r.data.lang} · traduzione volontaria di {x.r.data.name} · <Link href={url}>originale in italiano</Link></p><h1>{x.r.data.title}</h1>{x.r.data.text.split(/\n+/).filter(Boolean).map((p, i) => <p key={i} className="lr-p">{p}</p>)}<p className="help" dir="ltr">Traduzione fatta da un lettore e riletta dalla redazione. In caso di dubbio fa fede il testo italiano.</p></article></div>;
}
