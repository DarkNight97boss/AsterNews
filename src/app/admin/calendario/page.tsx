import { EditorialCalendar } from '@/components/admin/editorial-calendar';
import { requireUser } from '@/lib/auth';
import { getCategories, getUsers } from '@/lib/queries';

export default async function CalendarPage() {
  await requireUser();
  const [categories, users] = await Promise.all([getCategories(), getUsers()]);
  return <EditorialCalendar categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))} users={users.map((u) => ({ id: u.id, name: u.name }))} />;
}
