'use client';
import { useEffect, useState, useTransition } from 'react';
import { plansAction, startPlanCheckoutAction } from '@/lib/actions-community';
import { startTeamCheckoutAction } from '@/lib/actions-revenue';
import type { PaywallPlan } from '@/lib/models';

/** Abbonamento di quartiere: un gruppo di vicini compra più accessi con una sola carta e li distribuisce con i codici. */
export function NeighbourPlan() {
  const [plans, setPlans] = useState<PaywallPlan[]>([]); const [f, setF] = useState({ planId: '', seats: 4, name: '', email: '' }); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  useEffect(() => { plansAction().then((p) => { setPlans(p); if (p[0]) setF((x) => ({ ...x, planId: p[0].id })); }).catch(() => {}); }, []);
  void startPlanCheckoutAction; if (!plans.length) return <p className="help">Gli abbonamenti non sono ancora attivi su questo sito.</p>; const plan = plans.find((p) => p.id === f.planId);
  return <form className="contrib-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await startTeamCheckoutAction(f.planId, { seats: f.seats, company: `Vicini di ${f.name}`, email: f.email }); if (r.ok && r.url) location.href = r.url; else setMsg(r.message ?? 'Errore'); }); }}><div className="field"><label htmlFor="np-plan">Piano</label><select id="np-plan" className="select" value={f.planId} onChange={(e) => setF({ ...f, planId: e.target.value })}>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.price} €/{p.interval === 'year' ? 'anno' : 'mese'}</option>)}</select></div><div className="field"><label htmlFor="np-seats">Quanti vicini (accessi)</label><input id="np-seats" className="input" type="number" min={2} max={20} value={f.seats} onChange={(e) => setF({ ...f, seats: Number(e.target.value) })} /></div><div className="field"><label htmlFor="np-name">Via o condominio</label><input id="np-name" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div><div className="field"><label htmlFor="np-mail">La tua email (riceve i codici da distribuire)</label><input id="np-mail" className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>{plan && <p className="help">Totale: {(plan.price * f.seats).toFixed(2).replace('.', ',')} € per {f.seats} accessi. Una carta, {f.seats} codici: ognuno vale un accesso completo.</p>}{msg && <p className="form-error" role="alert">{msg}</p>}<button className="btn btn-primary" disabled={pending}>Paga per il gruppo</button></form>;
}
