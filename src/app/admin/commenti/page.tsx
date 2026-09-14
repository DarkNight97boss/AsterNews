import { redirect } from 'next/navigation';
import { CommentsTable } from '@/components/admin/comments-table';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { article, getComments } from '@/lib/queries';

export default async function CommentsPage() {
  const me = await requireUser();
  if (!can(me, 'comment.moderate')) redirect('/admin');
  const comments = await getComments();
  const titles: Record<string, string> = {};
  await Promise.all([...new Set(comments.map((c) => c.articleId))].map(async (id) => { titles[id] = (await article(id))?.title ?? '(articolo eliminato)'; }));
  return <CommentsTable comments={comments} titles={titles} />;
}
