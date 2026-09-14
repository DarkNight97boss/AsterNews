import { MediaLibrary } from '@/components/admin/media-library';
import { requireUser } from '@/lib/auth';
import { getMedia, getUsers } from '@/lib/queries';

export default async function MediaPage() {
  await requireUser();
  return <MediaLibrary media={getMedia()} users={getUsers()} />;
}
