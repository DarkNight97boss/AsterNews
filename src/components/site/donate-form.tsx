'use client';

import { useState, useTransition } from 'react';
import { startDonationAction } from '@/lib/actions-donations';
import { toast } from '@/components/ui/toaster';

export function DonateForm({ amounts, full }: { amounts: number[]; full: boolean }) {
  const [amount, setAmount] = useState(amounts[1] ?? amounts[0] ?? 5); const [custom, setCustom] = useState('');
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [pending, start] = useTransition();
  const value = custom ? Number(custom.replace(',', '.')) : amount;
  return (
    <div className="donate-form">
      <div className="donate-amounts">{amounts.map((a) => <button key={a} type="button" className={!custom && amount === a ? 'on' : ''} onClick={() => { setAmount(a); setCustom(''); }}>{a} €</button>)}<input className="input" placeholder="altro" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} /></div>
      {full && <><div className="form-row"><input className="input" placeholder="Nome (facoltativo)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input className="input" type="email" placeholder="Email per la ricevuta" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div><textarea className="textarea" placeholder="Un messaggio alla redazione (facoltativo)" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></>}
      <button type="button" className="btn btn-primary" disabled={pending || !(value >= 1)} onClick={() => start(async () => { const r = await startDonationAction({ amount: value, ...f }); if (r.ok && r.url) location.href = r.url; else toast.error(r.message ?? 'Errore'); })}>{pending ? 'Un momento…' : `Dona ${value >= 1 ? value.toFixed(2).replace('.', ',') + ' €' : ''}`}</button>
      <p className="help">Pagamento sicuro con carta tramite Stripe. Niente abbonamento, nessun addebito ricorrente.</p>
    </div>
  );
}
