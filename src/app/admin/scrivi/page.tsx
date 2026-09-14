import { RawWriter } from '@/components/admin/raw-writer';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getCategories, getMedia } from '@/lib/queries';

export default async function WritePage() {
  const me = await requireUser();
  const [cats, media] = await Promise.all([getCategories(), getMedia(300)]);
  const ordered = [...cats.filter((c) => c.kind !== 'opinion' && c.kind !== 'dossier'), ...cats.filter((c) => c.kind === 'opinion' || c.kind === 'dossier')];
  return <RawWriter categories={ordered} media={media} canPublish={can(me, 'article.publish')} />;
}
