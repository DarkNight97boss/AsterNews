import { redirect } from 'next/navigation';
import { BackupManager } from '@/components/admin/backup-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listBackups, tableCounts } from '@/lib/repo-extra';
import { DEFAULT_BACKUP } from '@/lib/models';
import { isRemote } from '@/lib/db';
import { storageLabel } from '@/lib/storage';

export default async function BackupPage() {
  const me = await requireUser();
  if (!can(me, 'settings.manage')) redirect('/admin');
  const [backups, counts, s, storage] = await Promise.all([listBackups(30), tableCounts(), getSettings(), storageLabel()]);
  const bk = { ...DEFAULT_BACKUP, ...(s.backup ?? {}) };
  return <BackupManager backups={backups} counts={counts} auto={bk} remote={isRemote()} storage={storage} />;
}
