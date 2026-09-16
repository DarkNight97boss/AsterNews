import { redirect } from 'next/navigation';
import { UpdatesPanel } from '@/components/admin/updates-panel';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { checkUpdates } from '@/lib/updates';

export default async function UpdatesPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  return <UpdatesPanel info={await checkUpdates()} />;
}
