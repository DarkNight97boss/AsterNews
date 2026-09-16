import { redirect } from 'next/navigation';
import { ApiKeysManager } from '@/components/admin/api-keys-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getSettings } from '@/lib/queries';
import { listApiKeys } from '@/lib/repo-extra3';
import { DEFAULT_API } from '@/lib/models';
import { siteUrl } from '@/lib/site-url';

export default async function ApiAdmin() {
  const me = await requireUser(); if (!can(me, 'settings.manage')) redirect('/admin');
  const [keys, s] = await Promise.all([listApiKeys(), getSettings()]);
  return <ApiKeysManager keys={keys} settings={{ ...DEFAULT_API, ...(s.api ?? {}) }} base={siteUrl()} />;
}
