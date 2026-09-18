'use client';

import { useState, useTransition } from 'react';
import { savePrivacyAction } from '@/lib/actions-system';
import { toast } from '@/components/ui/toaster';

export function PrivacyForm({ version, geo, dpa }: { version: number; geo: boolean; dpa: string }) {
  const [v, setV] = useState(version); const [g, setG] = useState(geo); const [d, setD] = useState(dpa); const [pending, start] = useTransition();
  return (
    <div className="panel"><div className="panel-title">Impostazioni</div>
      <div className="field"><label>Versione dell&apos;informativa cookie</label><input className="input" type="number" min={1} value={v} onChange={(e) => setV(Number(e.target.value))} /><div className="help">Aumentala quando cambi l&apos;informativa: il banner viene riproposto a tutti e i nuovi consensi vengono registrati con la nuova versione.</div></div>
      <label className="switch"><input type="checkbox" checked={g} onChange={(e) => setG(e.target.checked)} /> Geolocalizza gli IP nel log di sicurezza (servizio esterno ipapi.co)</label>
      <div className="field" style={{ marginTop: 10 }}><label>Note DPA / fornitori</label><textarea className="textarea" style={{ minHeight: 70 }} value={d} onChange={(e) => setD(e.target.value)} placeholder="Vercel DPA firmato il …; Supabase DPA …; Stripe …" /></div>
      <button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await savePrivacyAction({ policyVersion: v, geoLookup: g, dpaNote: d }); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva</button>
    </div>
  );
}
