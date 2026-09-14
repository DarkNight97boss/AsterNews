import { redirect } from 'next/navigation';
import { CommentsTable } from '@/components/admin/comments-table';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getAllArticles, getComments } from '@/lib/queries';

export default async function CommentsPage() {
  const me = await requireUser();
  if (!can(me, 'comment.moderate')) redirect('/admin');
  const titles: Record<string, string> = {};
  getAllArticles().forEach((a) => { titles[a.id] = a.title; });
  return <CommentsTable comments={getComments()} titles={titles} />;
}
