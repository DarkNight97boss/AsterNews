'use client';

import { useState, useTransition } from 'react';
import { deployStagingAction, promoteStagingAction } from '@/lib/actions-system';
import { toast } from '@/components/ui/toaster';

/** Staging: anteprima su un ramo dedicato con Deploy Hook, promozione in produzione via API Vercel, copia dati con script. */
export function StagingPanel({ configured, hasToken }: { configured: boolean; hasToken: boolean }) {
  const [pending, start] = useTransition(); const [last, setLast] = useState('');
  return (
    <div className="panel"><div className="panel-title">Ambiente di staging</div>
      <ol className="activity"><li><span>1</span><div>Crea un ramo <code>staging</code> su GitHub e un secondo Deploy Hook per quel ramo (Vercel → Settings → Git); incollalo in Impostazioni → Sistema.</div></li><li><span>2</span><div>Copia i dati in un database di prova: <code>npm run backup:export</code> poi <code>DATABASE_URL=&lt;staging&gt; npm run backup:restore -- --file backup.json</code>.</div></li><li><span>3</span><div>Prova l&apos;anteprima, poi promuovila in produzione da qui (serve un token Vercel con accesso al progetto).</div></li></ol>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button className="btn btn-outline btn-sm" disabled={pending || !configured} onClick={() => start(async () => { const r = await deployStagingAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); setLast(r.message ?? ''); })}>🚧 Crea anteprima staging</button>
        <button className="btn btn-primary btn-sm" disabled={pending || !hasToken} onClick={() => { if (!confirm('Promuovere in produzione l\'ultima anteprima pronta?')) return; start(async () => { const r = await promoteStagingAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); setLast(r.message ?? ''); }); }}>⬆ Promuovi in produzione</button>
      </div>
      {!configured && <p className="help" style={{ marginTop: 6 }}>Deploy Hook di staging non impostato.</p>}{!hasToken && <p className="help">Token Vercel non impostato (Impostazioni → Sistema): la promozione resta manuale dalla dashboard Vercel.</p>}
      {last && <p className="help" style={{ marginTop: 6 }}>{last}</p>}
    </div>
  );
}
