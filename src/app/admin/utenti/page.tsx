import { redirect } from 'next/navigation';
import { UsersManager } from '@/components/admin/users-manager';
import { requireUser } from '@/lib/auth';
import { can, rolePermissions } from '@/lib/permissions';
import { adminCount, getUsers } from '@/lib/queries';

export default async function UsersPage() {
  const me = await requireUser();
  if (!can(me, 'user.manage')) redirect('/admin');
  const users = await getUsers();
  const counts: Record<string, number> = {};
  await Promise.all(users.map(async (u) => { counts[u.id] = await adminCount({ authorId: u.id }); }));
  const rolePerms = Object.fromEntries((['admin', 'editor', 'author', 'contributor'] as const).map((r) => [r, rolePermissions(r)]));
  return <UsersManager users={users} meId={me.id} counts={counts} rolePerms={rolePerms} />;
}
