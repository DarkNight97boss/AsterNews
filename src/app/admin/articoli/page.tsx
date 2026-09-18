import Link from 'next/link';
import { ArticlesTable } from '@/components/admin/articles-table';
import { requireUser } from '@/lib/auth';
import { can, permissionsOf } from '@/lib/permissions';
import { ArticleStatus } from '@/lib/models';
import { adminArticles, adminCount, countByStatus, getCategories, getUsers } from '@/lib/queries';
import { countTrash, type ArticleSort } from '@/lib/repo';

const PER_PAGE = 50;
export default async function ArticlesPage({ searchParams }: PageProps<'/admin/articoli'>) {
  const me = await requireUser();
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : '');
  const page = Math.max(1, Number(str('pagina') || 1));
  const sort = (['published', 'updated', 'views', 'title', 'created'].includes(str('ordina')) ? str('ordina') : 'updated') as ArticleSort;
  const dir = str('dir') === 'asc' ? 'asc' : 'desc';
  const trash = str('cestino') === '1' && can(me, 'article.delete');
  const editionScope = me.role === 'admin' ? [] : Object.entries((await (await import('@/lib/queries')).getSettings()).editionUsers ?? {}).filter(([, ids]) => ids.includes(me.id)).map(([eid]) => eid);
  const editionId = editionScope.length === 1 ? editionScope[0] : undefined;
  const filter = { includeCircles: true, trash: trash || undefined, editionId, q: str('q') || undefined, status: (str('status') || undefined) as ArticleStatus | undefined, categoryId: str('categoria') || undefined, authorId: can(me, 'article.edit.any') ? (str('mine') === '1' ? me.id : str('autore') || undefined) : me.id };
  const [articles, total, counts, categories, users, trashCount] = await Promise.all([adminArticles(filter, sort, dir, PER_PAGE, (page - 1) * PER_PAGE), adminCount(filter), countByStatus(can(me, 'article.edit.any') ? {} : { authorId: me.id }), getCategories(), getUsers(), can(me, 'article.delete') ? countTrash() : Promise.resolve(0)]);
  return (
    <>
      <div className="page-title"><div><h1>Articoli</h1><p>{total} articoli · {can(me, 'article.edit.any') ? 'tutta la redazione' : 'solo i tuoi'}</p></div><div className="actions"><Link href="/admin/scrivi" className="btn btn-primary">✨ Scrivi</Link><Link href="/admin/articoli/nuovo" className="btn btn-outline">Editor completo</Link></div></div>
      <ArticlesTable trashCount={trashCount} articles={articles} total={total} page={page} perPage={PER_PAGE} counts={counts} categories={categories} users={users} me={me} permissions={permissionsOf(me)} filters={{ q: str('q'), status: str('status'), categoria: str('categoria'), autore: str('mine') === '1' ? me.id : str('autore'), ordina: sort, dir, cestino: trash ? '1' : '' }} />
    </>
  );
}
