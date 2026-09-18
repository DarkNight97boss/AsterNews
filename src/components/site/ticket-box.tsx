'use client';

import { useState, useTransition } from 'react';
import { startTicketCheckoutAction } from '@/lib/actions-engage';

export function TicketBox({ eventId, price, left, notice }: { eventId: string; price: number; left: number | null; notice: string }) {
  const [f, setF] = useState({ name: '', email: '', qty: 1 }); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  if (left !== null && left <= 0) return <div className="ticket-box"><b>Biglietti esauriti</b></div>;
  return (
    <div className="ticket-box"><b>Biglietti · {price.toFixed(2).replace('.', ',')} €</b>{left !== null && <span className="help"> · ne restano {left}</span>}
      {notice === 'ok' && <p className="notice ok">Pagamento riuscito: il codice del biglietto è in arrivo via email.</p>}{notice === 'annullato' && <p className="notice">Pagamento annullato.</p>}
      <input className="input" placeholder="Nome e cognome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input className="input" type="email" placeholder="Email per ricevere il biglietto" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <div className="actions"><select className="select" value={f.qty} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6].filter((n) => left === null || n <= left).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'biglietto' : 'biglietti'}</option>)}</select><button className="btn btn-primary btn-sm" disabled={pending || !f.email} onClick={() => start(async () => { const r = await startTicketCheckoutAction(eventId, f); if (r.ok && r.url) location.href = r.url; else setMsg(r.message ?? 'Errore'); })}>Acquista · {(price * f.qty).toFixed(2).replace('.', ',')} €</button></div>{msg && <p className="error-text">{msg}</p>}
    </div>
  );
}
