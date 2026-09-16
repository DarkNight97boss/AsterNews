import Link from 'next/link';
import { Event, EVENT_TYPE_LABELS } from '@/lib/models';
import { zone } from '@/lib/queries';
import { eventDateLabel } from '@/lib/utils';
import { SmartImage } from '@/components/ui/smart-image';

export function Stars({ n }: { n: number }) {
  if (!n) return null;
  return <span className="stars" aria-label={`${n} stelle su 5`}>{'★'.repeat(n)}<span className="off">{'★'.repeat(5 - n)}</span></span>;
}

export async function EventCard({ event: e }: { event: Event }) {
  const z = await zone(e.zoneId);
  return (
    <article className="event-card">
      <Link href={`/eventi/${e.slug}`} className="ev-img">
        {e.image ? <SmartImage src={e.image} alt={e.title} sizes="(max-width: 520px) calc(100vw - 40px), (max-width: 768px) 50vw, 400px" /> : <div className="ev-placeholder">📅</div>}
        <span className="badge badge-type">{EVENT_TYPE_LABELS[e.type]}</span>
      </Link>
      <div className="ev-body">
        <h3 className="ev-title"><Link href={`/eventi/${e.slug}`}>{e.title}</Link></h3>
        <Stars n={e.rating} />
        <div className="ev-meta"><span>📅 {eventDateLabel(e.dateFrom, e.dateTo)}</span>{e.place && <span>📍 {e.place}{z ? ` · ${z.name}` : ''}</span>}</div>
        {e.free && <span className="badge badge-gray">Gratis</span>}
      </div>
    </article>
  );
}
