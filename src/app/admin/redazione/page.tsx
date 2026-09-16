import { redirect } from 'next/navigation';
import { WorkflowManager } from '@/components/admin/workflow-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings, getUsers } from '@/lib/queries';
import { listArticles, listTags } from '@/lib/repo';
import { workflowOf } from '@/lib/workflow';

export default async function WorkflowPage() {
  const me = await requireUser(); if (!can(me, 'article.publish')) redirect('/admin');
  const [s, categories, users, tags, review] = await Promise.all([getSettings(), getCategories(), getUsers(), listTags(300), listArticles({ status: 'review' }, 'updated', 200)]);
  const w = workflowOf(s);
  const queues = w.desks.map((d) => ({ desk: d.name, articles: review.filter((a) => d.categoryIds.includes(a.categoryId)) }));
  const other = review.filter((a) => !w.desks.some((d) => d.categoryIds.includes(a.categoryId)));
  if (w.desks.length && other.length) queues.push({ desk: 'Senza desk', articles: other });
  return <WorkflowManager initial={w} categories={categories} users={users} tags={tags} queues={queues} />;
}
