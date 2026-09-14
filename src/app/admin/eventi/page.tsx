import { redirect } from 'next/navigation';
import { EventsManager } from '@/components/admin/events-manager';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getAllEvents, getMedia, getZones } from '@/lib/queries';

export default async function EventsAdminPage() {
  const me = await requireUser();
  if (!can(me, 'article.publish')) redirect('/admin');
  const [events, zones, media] = await Promise.all([getAllEvents(), getZones(), getMedia(300)]);
  return <EventsManager events={events} zones={zones} media={media} canDelete={can(me, 'article.delete')} />;
}
