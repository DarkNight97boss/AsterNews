'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveDonationsSettingsAction } from '@/lib/actions-system';
import type { DonationsSettings } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

export function DonationsSettingsForm({ initial, stripeReady }: { initial: DonationsSettings; stripeReady: boolean }) {
  const router = useRouter(); const [d, setD] = useState(initial); const [amounts, setAmounts] = useState(initial.amounts.join(', ')); const [pending, start] = useTransition();
  return (
    <div className="panel"><div className="panel-title">Impostazioni</div>
      {!stripeReady && <p className="lock-banner">Per incassare serve Stripe: inserisci la chiave segreta in Impostazioni → Pubblicità, abbonamenti, annunci. Le donazioni usano lo stesso account degli abbonamenti e degli annunci.</p>}
      <label className="switch" style={{ marginBottom: 12 }}><input type="checkbox" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} /> Donazioni attive (pagina /sostieni e riquadro in colonna)</label>
      <div className="form-row"><div className="field"><label>Titolo</label><input className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></div><div className="field"><label>Importi proposti (euro, separati da virgola)</label><input className="input" value={amounts} onChange={(e) => setAmounts(e.target.value)} /></div></div>
      <div className="field"><label>Testo di invito</label><textarea className="textarea" style={{ minHeight: 60 }} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} /></div>
      <div className="field"><label>Messaggio di ringraziamento</label><textarea className="textarea" style={{ minHeight: 60 }} value={d.thanks} onChange={(e) => setD({ ...d, thanks: e.target.value })} /></div>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveDonationsSettingsAction({ ...d, amounts: amounts.split(/[,\s;]+/).map(Number).filter((n) => n > 0) }); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva</button>
    </div>
  );
}
