import type { Metadata } from 'next';
import Form from 'next/form';
import Link from 'next/link';
import { EventCard } from '@/components/site/event-card';
import { EVENT_TYPE_LABELS, EventType } from '@/lib/models';
import { getEvents, getSettings } from '@/lib/queries';
import { dayOffset } from '@/lib/utils';

export const metadata: Metadata = { title: 'Cosa fare in città: eventi, concerti, mostre e sagre', description: 'Gli eventi in programma: concerti, mostre, teatro, sagre, cinema e feste. Filtra per periodo e tipologia.' };

const PERIODS: Record<string, string> = { oggi: 'Oggi', domani: 'Domani', weekend: 'Questo weekend', settimana: 'Questa settimana', mese: 'Questo mese', tutti: 'Tutti' };

function range(period: string): [string, string] {
  const today = dayOffset(0);
  const dow = new Date().getDay();
  const toSat = (6 - dow + 7) % 7;
  switch (period) {
    case 'oggi': return [today, today];
    case 'domani': return [dayOffset(1), dayOffset(1)];
    case 'weekend': return [dayOffset(toSat), dayOffset(toSat + 1)];
    case 'settimana': return [today, dayOffset(7)];
    case 'mese': return [today, dayOffset(31)];
    default: return [today, '9999-12-31'];
  }
}

export default async function EventsPage({ searchParams }: PageProps<'/eventi'>) {
  const sp = await searchParams;
  const period = typeof sp.periodo === 'string' && PERIODS[sp.periodo] ? sp.periodo : 'settimana';
  const tipo = typeof sp.tipo === 'string' && sp.tipo in EVENT_TYPE_LABELS ? (sp.tipo as EventType) : '';
  const [from, to] = range(period);
  const events = getEvents().filter((e) => e.dateFrom <= to && (e.dateTo ?? e.dateFrom) >= from).filter((e) => !tipo || e.type === tipo);
  return (
    <>
      <div className="section-head"><h1>Cosa fare in città</h1><div className="sub-topics">{(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <Link key={t} href={`/eventi?tipo=${t}&periodo=${period}`} style={tipo === t ? { color: 'var(--red)' } : undefined}>{EVENT_TYPE_LABELS[t].toLowerCase()}</Link>)}</div></div>
      <div className="event-filters">
        <Form action="/eventi" className="ef-form">
          <label><span>Eventi a {getSettings().weatherCity}</span><select className="select" name="periodo" defaultValue={period}>{Object.entries(PERIODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label><span>Tipologia</span><select className="select" name="tipo" defaultValue={tipo}><option value="">Tutti</option>{(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}</select></label>
          <button className="btn btn-dark" type="submit">Filtra</button>
        </Form>
        <Link href="/eventi/segnala" className="btn btn-outline">Segnala un evento</Link>
      </div>
      {events.length === 0 ? <div className="empty"><h3>Nessun evento</h3><p>Nessun evento in programma per il periodo selezionato.</p></div> : <div className="events-grid">{events.map((e) => <EventCard key={e.id} event={e} />)}</div>}
    </>
  );
}
