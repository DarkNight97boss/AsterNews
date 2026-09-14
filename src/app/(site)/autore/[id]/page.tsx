import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/site/article-list';
import { Sidebar } from '@/components/site/widgets';
import { ROLE_LABELS } from '@/lib/models';
import { articlesByAuthor, countPublished, getSettings, user } from '@/lib/queries';

export async function generateMetadata({ params }: PageProps<'/autore/[id]'>): Promise<Metadata> { const { id } = await params; return { title: (await user(id))?.name ?? 'Autore' }; }
export default async function AuthorPage({ params, searchParams }: PageProps<'/autore/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const u = await user(id);
  if (!u) notFound();
  const page = Math.max(1, Number(sp.pagina ?? 1) || 1); const perPage = (await getSettings()).articlesPerPage;
  const [articles, total] = await Promise.all([articlesByAuthor(u.id, perPage, (page - 1) * perPage), countPublished({ authorId: u.id })]);
  return (
    <>
      <div className="author-box" style={{ margin: '0 0 28px' }}><img src={u.avatar} alt={u.name} /><div><div className="role">{ROLE_LABELS[u.role]}</div><h2 style={{ fontSize: 26 }}>{u.name}</h2><p>{u.bio}</p><p className="count" style={{ marginTop: 6 }}>{total} articoli pubblicati</p></div></div>
      <div className="layout-sidebar"><div><ArticleList articles={articles} total={total} page={page} perPage={perPage} basePath={`/autore/${u.id}`} /></div><Sidebar /></div>
    </>
  );
}
