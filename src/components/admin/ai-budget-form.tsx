'use client';

import { useState, useTransition } from 'react';
import { saveAiBudgetAction } from '@/lib/actions-release';
import { toast } from '@/components/ui/toaster';

export function AiBudgetForm({ budget, priceIn, priceOut }: { budget: number; priceIn: number; priceOut: number }) {
  const [b, setB] = useState({ monthlyBudget: budget, priceIn, priceOut }); const [pending, start] = useTransition();
  return (
    <div className="panel"><div className="panel-title">Tetto di spesa e prezzi</div>
      <div className="field"><label>Tetto mensile in euro (0 = nessun limite)</label><input className="input" type="number" min={0} step="1" value={b.monthlyBudget} onChange={(e) => setB({ ...b, monthlyBudget: Number(e.target.value) })} /></div>
      <div className="form-row"><div className="field"><label>Prezzo per milione di token in ingresso (€)</label><input className="input" type="number" min={0} step="0.01" value={b.priceIn} onChange={(e) => setB({ ...b, priceIn: Number(e.target.value) })} /></div><div className="field"><label>Prezzo per milione di token in uscita (€)</label><input className="input" type="number" min={0} step="0.01" value={b.priceOut} onChange={(e) => setB({ ...b, priceOut: Number(e.target.value) })} /></div></div>
      <p className="help">I prezzi dipendono dal modello scelto: copiali dal listino di Anthropic. Senza prezzi vengono contati solo i token e il tetto non scatta.</p>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveAiBudgetAction(b); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva</button>
    </div>
  );
}
