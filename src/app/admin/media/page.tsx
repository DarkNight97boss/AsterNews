import { MediaLibrary } from '@/components/admin/media-library';
import { requireUser } from '@/lib/auth';
import { getMedia, getUsers } from '@/lib/queries';

export default async function MediaPage() { await requireUser(); const [media, users] = await Promise.all([getMedia(500), getUsers()]); return <MediaLibrary media={media} users={users} />; }
