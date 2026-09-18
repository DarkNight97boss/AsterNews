'use client';

import { useState, useTransition } from 'react';
import { startAdOrderAction } from '@/lib/actions-revenue';

export function AdOrderForm({ slots }: { slots: { id: string; name: string; size: string; price: number }[] }) {
  const [f, setF] = useState({ slot: slots[0].id, startAt: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), days: 7, image: '', url: '', company: '', email: '' }); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  const cur = slots.find((s) => s.id === f.slot)!; const total = cur.price * f.days;
  return (
    <form className="ad-order" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await startAdOrderAction(f); if (r.ok && r.url) location.href = r.url; else setMsg(r.message ?? 'Errore'); }); }}>
      <div className="plans-grid">{slots.map((s) => <label key={s.id} className={`plan ${f.slot === s.id ? 'hl' : ''}`}><input type="radio" name="slot" checked={f.slot === s.id} onChange={() => setF({ ...f, slot: s.id })} /> <b>{s.name}</b><span className="help">{s.size}</span><div className="plan-price">{s.price.toFixed(2).replace('.', ',')} €<span>/giorno</span></div></label>)}</div>
      <div className="form-row"><div className="field"><label>Dal giorno</label><input className="input" type="date" value={f.startAt} onChange={(e) => setF({ ...f, startAt: e.target.value })} required /></div><div className="field"><label>Per quanti giorni</label><input className="input" type="number" min={1} max={90} value={f.days} onChange={(e) => setF({ ...f, days: Number(e.target.value) })} /></div></div>
      <div className="field"><label>Indirizzo del banner (immagine https, misura {cur.size})</label><input className="input" type="url" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} placeholder="https://…/banner.jpg" required /></div>
      <div className="field"><label>Pagina di destinazione</label><input className="input" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://www.tuaattivita.it" required /></div>
      <div className="form-row"><div className="field"><label>Azienda</label><input className="input" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} required /></div><div className="field"><label>Email (per fattura e conferma)</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div></div>
      <button className="btn btn-primary" disabled={pending}>Paga {total.toFixed(2).replace('.', ',')} € e invia l&apos;ordine</button>{msg && <p className="error-text">{msg}</p>}
      <p className="help">Pagamento con Stripe, fattura automatica. Se il banner non rispetta le regole editoriali l&apos;importo viene rimborsato.</p>
    </form>
  );
}
