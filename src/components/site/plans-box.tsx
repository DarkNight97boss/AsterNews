'use client';

import { useState, useTransition } from 'react';
import { redeemGiftAction, startPlanCheckoutAction } from '@/lib/actions-community';
import type { PaywallPlan } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

/** Piani di abbonamento (base, sostenitore, annuale…), abbonamento regalo e riscatto codice. */
export function PlansBox({ plans, loggedIn, giftCode }: { plans: PaywallPlan[]; loggedIn: boolean; giftCode: string }) {
  const [gift, setGift] = useState<{ planId: string; email: string; message: string } | null>(null); const [code, setCode] = useState(giftCode); const [pending, start] = useTransition();
  if (!plans.length && !giftCode) return null;
  return (
    <div className="account-card plans-box">
      {plans.length > 0 && <><h2>Scegli il tuo piano</h2>
        <div className="plans-grid">{plans.map((p) => <div key={p.id} className={`plan ${p.highlight ? 'hl' : ''}`}><b>{p.name}</b><div className="plan-price">{p.price.toFixed(2).replace('.', ',')} €<span>/{p.interval === 'year' ? 'anno' : p.interval === 'once' ? 'una tantum' : 'mese'}</span></div><p>{p.description}</p><button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await startPlanCheckoutAction(p.id); if (r.ok && r.url) location.href = r.url; else toast.error(r.message ?? ''); })}>{loggedIn ? 'Abbonati' : 'Accedi e abbonati'}</button><button className="btn btn-ghost btn-sm" onClick={() => setGift({ planId: p.id, email: '', message: '' })}>🎁 Regala</button></div>)}</div>
        <p className="help">Pagamento sicuro con carta, Apple Pay, Google Pay e gli altri metodi attivi. Disdici quando vuoi dal tuo account.</p></>}
      {gift && <div className="gift-form"><h3>Regala un abbonamento</h3><input className="input" type="email" placeholder="Email di chi lo riceve" value={gift.email} onChange={(e) => setGift({ ...gift, email: e.target.value })} /><textarea className="textarea" placeholder="Un messaggio (facoltativo)" value={gift.message} onChange={(e) => setGift({ ...gift, message: e.target.value })} /><div className="actions"><button className="btn btn-primary btn-sm" disabled={pending || !gift.email} onClick={() => start(async () => { const r = await startPlanCheckoutAction(gift.planId, { email: gift.email, message: gift.message }); if (r.ok && r.url) location.href = r.url; else toast.error(r.message ?? ''); })}>Paga il regalo</button><button className="btn btn-ghost btn-sm" onClick={() => setGift(null)}>Annulla</button></div></div>}
      <div className="gift-redeem"><h3>Hai un codice regalo?</h3><div className="actions"><input className="input" placeholder="DONO-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn btn-outline btn-sm" disabled={pending || !code} onClick={() => start(async () => { const r = await redeemGiftAction(code); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Attiva</button></div>{!loggedIn && <p className="help">Accedi o registrati prima di attivare il codice.</p>}</div>
    </div>
  );
}
