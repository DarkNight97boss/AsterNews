import { redirect } from 'next/navigation';
import { UsersManager } from '@/components/admin/users-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getAllArticles, getUsers } from '@/lib/queries';

export default async function UsersPage() {
  const me = await requireUser();
  if (!can(me, 'user.manage')) redirect('/admin');
  const counts: Record<string, number> = {};
  getAllArticles().forEach((a) => { counts[a.authorId] = (counts[a.authorId] ?? 0) + 1; });
  return <UsersManager users={getUsers()} meId={me.id} counts={counts} />;
}
