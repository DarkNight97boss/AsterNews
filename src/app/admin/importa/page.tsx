import { redirect } from 'next/navigation';
import { WpImporter } from '@/components/admin/wp-importer';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories } from '@/lib/queries';

export default async function ImportPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  return <WpImporter categories={getCategories()} />;
}
