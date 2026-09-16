import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublished } from '@/lib/queries';
import { SmartImage } from '@/components/ui/smart-image';

export const metadata: Metadata = { title: 'Web Stories', description: 'Le notizie in formato storia: foto e testi brevi da sfogliare dal telefono.' };
export const dynamic = 'force-dynamic';
export default async function StoriesPage() {
  const all = await getPublished(120);
  const stories = all.filter((a) => [a.coverImage, ...a.gallery].filter(Boolean).length >= 2 || (a.content.match(/<img/g) ?? []).length >= 1 && a.coverImage);
  return (
    <div className="container" style={{ padding: '24px 20px' }}>
      <div className="section-title"><h1>Web Stories</h1></div>
      <p className="help" style={{ marginBottom: 16 }}>Le notizie da sfogliare come storie: foto a tutto schermo e testi brevi.</p>
      <div className="stories-grid">{stories.slice(0, 40).map((a) => <a key={a.id} href={`/storie/${a.slug}`} className="story-card"><div className="story-img"><SmartImage src={a.coverImage} alt={a.title} slot="card-sm" /></div><b>{a.title}</b></a>)}</div>
      {stories.length === 0 && <p className="help">Nessuna storia ancora: servono articoli con almeno due foto.</p>}
      <p className="help" style={{ marginTop: 16 }}><Link href="/">← Torna alla home</Link></p>
    </div>
  );
}
