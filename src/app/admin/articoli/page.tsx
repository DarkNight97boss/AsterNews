import Link from 'next/link';
import { ArticlesTable } from '@/components/admin/articles-table';
import { requireUser } from '@/lib/auth';
import { can, permissionsOf } from '@/lib/permissions';
import { getAllArticles, getCategories, getPublished, getUsers } from '@/lib/queries';

export default async function ArticlesPage({ searchParams }: PageProps<'/admin/articoli'>) {
  const me = await requireUser();
  const { status } = await searchParams;
  const articles = can(me, 'article.edit.any') ? getAllArticles() : getAllArticles().filter((a) => a.authorId === me.id);
  return (
    <>
      <div className="page-title">
        <div><h1>Articoli</h1><p>{articles.length} articoli · {can(me, 'article.edit.any') ? 'tutta la redazione' : 'solo i tuoi'}</p></div>
        <div className="actions"><Link href="/admin/articoli/nuovo" className="btn btn-primary">+ Nuovo articolo</Link></div>
      </div>
      <ArticlesTable articles={articles} categories={getCategories()} users={getUsers()} me={me} permissions={permissionsOf(me)} publicIds={getPublished().map((a) => a.id)} initialStatus={typeof status === 'string' ? status : ''} />
    </>
  );
}
