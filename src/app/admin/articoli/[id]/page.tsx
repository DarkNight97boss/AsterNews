import { notFound, redirect } from 'next/navigation';
import { ArticleEditor } from '@/components/admin/article-editor';
import { requireUser } from '@/lib/auth';
import { canEdit, permissionsOf } from '@/lib/permissions';
import { article, getCategories, getMedia, getPublished, getTags, getUsers, getZones } from '@/lib/queries';

export default async function EditArticlePage({ params }: PageProps<'/admin/articoli/[id]'>) {
  const me = await requireUser();
  const { id } = await params;
  const a = article(id);
  if (!a) notFound();
  if (!canEdit(me, a)) redirect('/admin/articoli');
  return <ArticleEditor key={a.updatedAt} initial={a} isNew={false} isPublic={getPublished().some((p) => p.id === a.id)} categories={getCategories()} zones={getZones()} tags={getTags()} users={getUsers()} media={getMedia()} permissions={permissionsOf(me)} />;
}
