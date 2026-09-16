import { storageLabel } from '@/lib/storage';
import { MediaLibrary } from '@/components/admin/media-library';
import { requireUser } from '@/lib/auth';
import { getMedia, getSettings, getUsers } from '@/lib/queries';
import { listMediaTrash } from '@/lib/repo';

export default async function MediaPage() {
  await requireUser();
  const [media, trash, users, s, label] = await Promise.all([getMedia(500), listMediaTrash(), getUsers(), getSettings(), storageLabel()]);
  const stockProviders = [s.storage?.unsplashKey ? 'unsplash' : '', s.storage?.pexelsKey ? 'pexels' : ''].filter(Boolean);
  return <MediaLibrary storageLabel={label} media={media} trash={trash} users={users} videoProvider={s.video?.provider ?? 'none'} stockProviders={stockProviders} />;
}
