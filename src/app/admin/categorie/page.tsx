import { redirect } from 'next/navigation';
import { CategoriesManager } from '@/components/admin/categories-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { categoryCounts, getCategories } from '@/lib/queries';

export default async function CategoriesPage() {
  const me = await requireUser();
  if (!can(me, 'category.manage')) redirect('/admin');
  const [categories, counts] = await Promise.all([getCategories(), categoryCounts()]);
  return <CategoriesManager categories={categories} counts={counts} />;
}
