import { RawWriter } from '@/components/admin/raw-writer';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getMedia } from '@/lib/queries';

export default async function WritePage() {
  const me = await requireUser();
  return <RawWriter categories={getCategories().filter((c) => c.kind !== 'opinion' && c.kind !== 'dossier').concat(getCategories().filter((c) => c.kind === 'opinion' || c.kind === 'dossier'))} media={getMedia()} canPublish={can(me, 'article.publish')} />;
}
