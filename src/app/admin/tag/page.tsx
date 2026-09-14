import { redirect } from 'next/navigation';
import { TagsManager } from '@/components/admin/tags-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getTags, tagCounts } from '@/lib/queries';
import { searchTags } from '@/lib/repo';

export default async function TagsPage({ searchParams }: PageProps<'/admin/tag'>) {
  const me = await requireUser();
  if (!can(me, 'tag.manage')) redirect('/admin');
  const { q } = await searchParams;
  const [tags, counts] = await Promise.all([typeof q === 'string' && q ? searchTags(q, 200) : getTags(), tagCounts()]);
  return <TagsManager tags={tags} counts={counts} serverQuery={typeof q === 'string' ? q : ''} />;
}
