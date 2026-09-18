'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { runBriefingAction, saveBriefingSettingsAction, saveRundownNotesAction } from '@/lib/actions-newsroom';
import { toast } from '@/components/ui/toaster';

export function RundownTools({ day, notes, canRun, canConfig, briefing }: { day: string; notes: string; canRun: boolean; canConfig: boolean; briefing: { enabled: boolean; hour: number; feeds: string; count: number } }) {
  const router = useRouter(); const [n, setN] = useState(notes); const [b, setB] = useState(briefing); const [pending, start] = useTransition();
  return (
    <div className="admin-grid-2" style={{ marginTop: 16 }}>
      <div className="panel"><div className="panel-title">Appunti della riunione <span className="noprint"><button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨 Stampa</button></span></div>
        <textarea className="textarea" style={{ minHeight: 160 }} value={n} onChange={(e) => setN(e.target.value)} placeholder="Decisioni, assegnazioni, cose da verificare…" />
        <button className="btn btn-primary btn-sm noprint" style={{ marginTop: 8 }} disabled={pending} onClick={() => start(async () => { const r = await saveRundownNotesAction(day, n); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva appunti</button>
      </div>
      <div className="panel noprint"><div className="panel-title">Rassegna mattutina automatica {canRun && <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await runBriefingAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>{pending ? 'Leggo i feed…' : 'Genera ora'}</button>}</div>
        <p className="help">L&apos;assistente legge i feed scelti, unisce le notizie sullo stesso fatto e prepara bozze «da valutare» con le fonti collegate. Niente viene pubblicato da solo.</p>
        {canConfig && <><label className="switch" style={{ margin: '8px 0' }}><input type="checkbox" checked={b.enabled} onChange={(e) => setB({ ...b, enabled: e.target.checked })} /> Ogni mattina alle <input className="input" type="number" min={0} max={23} style={{ width: 64, display: 'inline-block', margin: '0 6px' }} value={b.hour} onChange={(e) => setB({ ...b, hour: Number(e.target.value) })} /> prepara <input className="input" type="number" min={1} max={10} style={{ width: 64, display: 'inline-block', margin: '0 6px' }} value={b.count} onChange={(e) => setB({ ...b, count: Number(e.target.value) })} /> bozze</label>
          <div className="field"><label>Feed da leggere (uno per riga)</label><textarea className="textarea" style={{ minHeight: 90, fontFamily: 'monospace', fontSize: 12 }} value={b.feeds} onChange={(e) => setB({ ...b, feeds: e.target.value })} placeholder={'https://www.ansa.it/sito/ansait_rss.xml\nhttps://www.comune.esempio.it/feed'} /></div>
          <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveBriefingSettingsAction(b); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva impostazioni</button></>}
      </div>
    </div>
  );
}
