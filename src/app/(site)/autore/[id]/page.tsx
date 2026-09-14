import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/sidebar';
import { ROLE_LABELS } from '@/lib/models';
import { articlesByAuthor, user } from '@/lib/queries';

export async function generateMetadata({ params }: PageProps<'/autore/[id]'>): Promise<Metadata> {
  const { id } = await params;
  return { title: user(id)?.name ?? 'Autore' };
}

export default async function AuthorPage({ params }: PageProps<'/autore/[id]'>) {
  const { id } = await params;
  const u = user(id);
  if (!u) notFound();
  const articles = articlesByAuthor(u.id);
  return (
    <>
      <div className="author-box" style={{ margin: '0 0 28px' }}>
        <img src={u.avatar} alt={u.name} />
        <div><div className="role">{ROLE_LABELS[u.role]}</div><h4 style={{ fontSize: 26 }}>{u.name}</h4><p>{u.bio}</p><p className="count" style={{ marginTop: 6 }}>{articles.length} articoli pubblicati</p></div>
      </div>
      <div className="layout-sidebar"><ArticleList articles={articles} /><Sidebar /></div>
    </>
  );
}
