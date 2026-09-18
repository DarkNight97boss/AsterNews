import { redirect } from 'next/navigation';
import { UpdatesPanel } from '@/components/admin/updates-panel';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { checkUpdates } from '@/lib/updates';
import { StagingPanel } from '@/components/admin/staging-panel';
import { getSettings } from '@/lib/queries';

export default async function UpdatesPage() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const s = await getSettings();
  return <><UpdatesPanel info={await checkUpdates()} /><StagingPanel configured={!!s.updates?.stagingHookUrl} hasToken={!!((s.updates?.vercelToken || process.env.VERCEL_TOKEN) && (s.updates?.vercelProjectId || process.env.VERCEL_PROJECT_ID))} /></>;
}
