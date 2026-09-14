import { redirect } from 'next/navigation';
import { TagsManager } from '@/components/admin/tags-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getAllArticles, getTags } from '@/lib/queries';

export default async function TagsPage() {
  const me = await requireUser();
  if (!can(me, 'tag.manage')) redirect('/admin');
  const counts: Record<string, number> = {};
  getAllArticles().forEach((a) => a.tagIds.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; }));
  return <TagsManager tags={getTags()} counts={counts} />;
}
