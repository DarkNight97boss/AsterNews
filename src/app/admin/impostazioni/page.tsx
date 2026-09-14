import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/admin/settings-form';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getSettings } from '@/lib/queries';

export default async function SettingsPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  const s = getSettings();
  return <SettingsForm key={JSON.stringify(s)} initial={s} categories={getCategories()} />;
}
