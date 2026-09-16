import Link from 'next/link';
import { getCategories, getMostRead, getTags, listPublished } from '@/lib/queries';
import { ArticleCard } from './article-card';
import { NewsletterForm } from './newsletter-form';
import { AdSlot } from './ad-slot';

export async function MostRead({ n = 5, exclude = '' }: { n?: number; exclude?: string }) {
  const list = (await getMostRead(n + 1)).filter((a) => a.id !== exclude).slice(0, n);
  return <div className="widget"><h3 className="widget-title">I più letti</h3>{list.map((a, i) => <ArticleCard key={a.id} article={a} variant="number" index={i + 1} />)}</div>;
}
export async function FromCities({ n = 5 }: { n?: number }) {
  const local = (await getCategories()).find((c) => c.kind === 'local');
  if (!local) return null;
  const list = await listPublished({ categoryId: local.id }, n);
  if (!list.length) return null;
  return <div className="widget"><h3 className="widget-title">{local.name} <Link href={`/${local.slug}`}>Tutte</Link></h3>{list.map((a) => <ArticleCard key={a.id} article={a} variant="city" />)}</div>;
}
export function NewsletterWidget() {
  return <div className="widget-newsletter" id="newsletter"><h3>La newsletter di ASTER</h3><p>Le notizie più importanti della giornata, ogni mattina alle 7 nella tua casella email. Gratis.</p><NewsletterForm /></div>;
}
export async function TagsWidget() {
  const tags = (await getTags()).slice(0, 20);
  return <div className="widget"><h3 className="widget-title">Argomenti</h3><div className="tag-cloud">{tags.map((t) => <Link key={t.id} href={`/tag/${t.slug}`}>{t.name}</Link>)}</div></div>;
}
export function Sidebar({ exclude = '' }: { exclude?: string }) {
  return <aside className="sidebar"><MostRead exclude={exclude} /><NewsletterWidget /><FromCities /><TagsWidget /><AdSlot slot="sidebar_300" /></aside>;
}
