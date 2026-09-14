import { redirect } from 'next/navigation';
import { CategoriesManager } from '@/components/admin/categories-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getAllArticles, getCategories } from '@/lib/queries';

export default async function CategoriesPage() {
  const me = await requireUser();
  if (!can(me, 'category.manage')) redirect('/admin');
  const counts: Record<string, number> = {};
  getAllArticles().forEach((a) => { counts[a.categoryId] = (counts[a.categoryId] ?? 0) + 1; });
  return <CategoriesManager categories={getCategories()} counts={counts} />;
}
