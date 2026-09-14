'use client';

import { useState, useTransition } from 'react';
import { submitEventAction } from '@/lib/actions';
import { EVENT_TYPE_LABELS, EventType } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function EventSubmitForm({ zones }: { zones: { id: string; name: string }[] }) {
  const [f, setF] = useState({ title: '', type: 'concerti' as EventType, dateFrom: '', dateTo: '', timeInfo: '', place: '', address: '', zoneId: '', price: '', free: false, description: '', email: '' });
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });
  if (done) return <div className="panel"><h3>Grazie!</h3><p>La segnalazione è arrivata in redazione e sarà pubblicata dopo la verifica.</p></div>;
  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitEventAction(f); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setDone(true); }); }}>
      <div className="field"><label htmlFor="ev-titolodell">Titolo dell&apos;evento *</label><input id="ev-titolodell" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} required /></div>
      <div className="form-row">
        <div className="field"><label htmlFor="ev-tipologia">Tipologia</label><select id="ev-tipologia" className="select" value={f.type} onChange={(e) => set('type', e.target.value)}>{(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((t) => <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>)}</select></div>
        <div className="field"><label htmlFor="ev-zona">Zona</label><select id="ev-zona" className="select" value={f.zoneId} onChange={(e) => set('zoneId', e.target.value)}><option value="">Seleziona...</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="ev-datainizio">Data inizio *</label><input id="ev-datainizio" className="input" type="date" value={f.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} required /></div>
        <div className="field"><label htmlFor="ev-datafine">Data fine</label><input id="ev-datafine" className="input" type="date" value={f.dateTo} onChange={(e) => set('dateTo', e.target.value)} /></div>
        <div className="field"><label htmlFor="ev-orario">Orario</label><input id="ev-orario" className="input" value={f.timeInfo} onChange={(e) => set('timeInfo', e.target.value)} placeholder="es. ore 21:00" /></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="ev-luogo">Luogo *</label><input id="ev-luogo" className="input" value={f.place} onChange={(e) => set('place', e.target.value)} required /></div>
        <div className="field"><label htmlFor="ev-indirizzo">Indirizzo</label><input id="ev-indirizzo" className="input" value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="ev-prezzo">Prezzo</label><input id="ev-prezzo" className="input" value={f.price} onChange={(e) => set('price', e.target.value)} disabled={f.free} placeholder="es. 15 euro" /></div>
        <div className="field"><label>&nbsp;</label><label className="checkbox"><input type="checkbox" checked={f.free} onChange={(e) => set('free', e.target.checked)} /> Ingresso gratuito</label></div>
      </div>
      <div className="field"><label htmlFor="ev-descrizion">Descrizione</label><textarea id="ev-descrizion" className="textarea" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
      <div className="field"><label htmlFor="ev-latuaemail">La tua email *</label><input id="ev-latuaemail" className="input" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} required /><span className="help">Non sarà pubblicata: serve alla redazione per eventuali chiarimenti.</span></div>
      <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>Invia segnalazione</button>
    </form>
  );
}
