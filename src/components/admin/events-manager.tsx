'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteEventAction, saveEventAction, setEventStatusAction } from '@/lib/actions';
import { EVENT_STATUS_LABELS, EVENT_TYPE_LABELS, Event, EventStatus, EventType, MediaItem, Zone } from '@/lib/models';
import { eventDateLabel, formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { MediaPicker } from './media-picker';

const CLS: Record<string, string> = { published: 'badge-green', pending: 'badge-amber', archived: 'badge-dark' };
const blank = (): Event => ({ id: '', slug: '', title: '', description: '', type: 'concerti', dateFrom: new Date().toISOString().slice(0, 10), dateTo: null, timeInfo: '', place: '', address: '', zoneId: '', price: '', free: false, image: '', rating: 4, status: 'published', submittedBy: '', createdAt: '' });

export function EventsManager({ events, zones, media, canDelete }: { events: Event[]; zones: Zone[]; media: MediaItem[]; canDelete: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<EventStatus | ''>('');
  const [editing, setEditing] = useState<Event | null>(null);
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const counts: Record<string, number> = { pending: 0, published: 0, archived: 0 };
  events.forEach((e) => counts[e.status]++);
  const list = events.filter((e) => !filter || e.status === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? '';
  const save = () => start(async () => { const r = await saveEventAction(editing!); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); router.refresh(); } });
  const E = editing;
  return (
    <>
      <div className="page-title"><div><h1>Eventi</h1><p>Cosa fare in città: {events.length} eventi, {counts.pending} da approvare.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing(blank())}>+ Nuovo evento</button></div></div>
      <div className="filters">
        <button className={`btn btn-sm ${filter === '' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter('')}>Tutti ({events.length})</button>
        {(['pending', 'published', 'archived'] as EventStatus[]).map((s) => <button key={s} className={`btn btn-sm ${filter === s ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter(s)}>{EVENT_STATUS_LABELS[s]} ({counts[s]})</button>)}
      </div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th style={{ width: 70 }}></th><th>Evento</th><th>Quando</th><th>Dove</th><th>Stato</th><th></th></tr></thead>
        <tbody>
          {list.map((e) => (
            <tr key={e.id}>
              <td>{e.image ? <img className="t-thumb" src={e.image} alt="" /> : <div className="t-thumb" />}</td>
              <td className="t-title">{e.title}<div className="t-sub"><span className="badge badge-gray" style={{ marginRight: 6 }}>{EVENT_TYPE_LABELS[e.type]}</span>{e.free ? 'Gratis' : e.price}{e.submittedBy && <> · segnalato da {e.submittedBy}</>}</div></td>
              <td style={{ fontSize: 13 }}>{eventDateLabel(e.dateFrom, e.dateTo)}<div className="t-sub" style={{ fontSize: 12, color: 'var(--gray-500)' }}>{e.timeInfo}</div></td>
              <td style={{ fontSize: 13 }}>{e.place}<div className="t-sub" style={{ fontSize: 12, color: 'var(--gray-500)' }}>{zoneName(e.zoneId)}</div></td>
              <td><span className={`badge ${CLS[e.status]}`}>{EVENT_STATUS_LABELS[e.status]}</span></td>
              <td><div className="t-actions">
                {e.status !== 'published' && <ActionButton className="btn btn-success btn-sm" action={() => setEventStatusAction(e.id, 'published')}>Pubblica</ActionButton>}
                {e.status === 'published' && <ActionButton className="btn btn-outline btn-sm" action={() => setEventStatusAction(e.id, 'archived')}>Archivia</ActionButton>}
                <button className="icon-btn" onClick={() => setEditing({ ...e })}>✎</button>
                {canDelete && <ActionButton className="icon-btn danger" confirm={`Eliminare "${e.title}"?`} action={() => deleteEventAction(e.id)}>🗑</ActionButton>}
              </div></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={6}><div className="empty"><h3>Nessun evento</h3></div></td></tr>}
        </tbody></table></div>

      {E && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal" onClick={(ev) => ev.stopPropagation()}>
          <div className="modal-head"><h3>{E.id ? 'Modifica evento' : 'Nuovo evento'}</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Titolo</label><input className="input" value={E.title} onChange={(e) => setEditing({ ...E, title: e.target.value })} /></div>
            <div className="form-row">
              <div className="field"><label>Tipologia</label><select className="select" value={E.type} onChange={(e) => setEditing({ ...E, type: e.target.value as EventType })}>{(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}</select></div>
              <div className="field"><label>Stato</label><select className="select" value={E.status} onChange={(e) => setEditing({ ...E, status: e.target.value as EventStatus })}>{(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((s) => <option key={s} value={s}>{EVENT_STATUS_LABELS[s]}</option>)}</select></div>
              <div className="field"><label>Valutazione (0-5)</label><input className="input" type="number" min={0} max={5} value={E.rating} onChange={(e) => setEditing({ ...E, rating: Number(e.target.value) })} /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Data inizio</label><input className="input" type="date" value={E.dateFrom} onChange={(e) => setEditing({ ...E, dateFrom: e.target.value })} /></div>
              <div className="field"><label>Data fine</label><input className="input" type="date" value={E.dateTo ?? ''} onChange={(e) => setEditing({ ...E, dateTo: e.target.value || null })} /></div>
              <div className="field"><label>Orario</label><input className="input" value={E.timeInfo} onChange={(e) => setEditing({ ...E, timeInfo: e.target.value })} placeholder="es. ore 21:00" /></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Luogo</label><input className="input" value={E.place} onChange={(e) => setEditing({ ...E, place: e.target.value })} /></div>
              <div className="field"><label>Indirizzo</label><input className="input" value={E.address} onChange={(e) => setEditing({ ...E, address: e.target.value })} /></div>
              <div className="field"><label>Zona</label><select className="select" value={E.zoneId} onChange={(e) => setEditing({ ...E, zoneId: e.target.value })}><option value="">Nessuna</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            </div>
            <div className="form-row">
              <div className="field"><label>Prezzo</label><input className="input" value={E.price} disabled={E.free} onChange={(e) => setEditing({ ...E, price: e.target.value })} /></div>
              <div className="field"><label>Biglietto online (€, 0 = non in vendita)</label><input className="input" type="number" min={0} step="0.5" value={E.ticketPrice ?? 0} onChange={(e) => setEditing({ ...E, ticketPrice: Number(e.target.value) || undefined })} /></div>
              <div className="field"><label>Posti disponibili (0 = illimitati)</label><input className="input" type="number" min={0} value={E.ticketsTotal ?? 0} onChange={(e) => setEditing({ ...E, ticketsTotal: Number(e.target.value) || undefined })} /></div>
              <div className="field"><label>&nbsp;</label><label className="checkbox"><input type="checkbox" checked={E.free} onChange={(e) => setEditing({ ...E, free: e.target.checked })} /> Ingresso gratuito</label></div>
            </div>
            <div className="field"><label>Descrizione (HTML consentito)</label><textarea className="textarea" value={E.description} onChange={(e) => setEditing({ ...E, description: e.target.value })} /></div>
            <div className="field cover-picker"><label>Immagine</label><div className="cover-preview" style={{ maxWidth: 320 }}>{E.image ? <img src={E.image} alt="" /> : 'Nessuna immagine'}</div><div className="cover-actions"><button className="btn btn-outline btn-sm" onClick={() => setPicker(true)}>Scegli dalla libreria</button>{E.image && <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...E, image: '' })}>Rimuovi</button>}</div></div>
            {E.submittedBy && <p className="help">Segnalato da {E.submittedBy}{E.createdAt && <> il {formatDate(E.createdAt)}</>}</p>}
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={!E.title.trim() || !E.dateFrom || pending} onClick={save}>Salva</button></div>
        </div></div>
      )}
      {picker && E && <MediaPicker media={media} onPick={(m) => { setEditing({ ...E, image: m.url }); setPicker(false); router.refresh(); }} onClose={() => setPicker(false)} />}
    </>
  );
}
