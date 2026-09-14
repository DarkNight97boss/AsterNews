import { redirect } from 'next/navigation';
import { WpImporter } from '@/components/admin/wp-importer';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories } from '@/lib/queries';
import { listJobs } from '@/lib/repo';
import { isServerless } from '@/lib/db';
import { resumePendingJobs } from '@/lib/import-jobs';

export default async function ImportPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  await resumePendingJobs();
  const [categories, jobs] = await Promise.all([getCategories(), listJobs(10)]);
  return <WpImporter categories={categories} jobs={jobs} serverless={isServerless()} />;
}
