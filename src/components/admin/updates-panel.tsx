'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { triggerDeployAction } from '@/lib/actions-system';
import type { UpdateInfo } from '@/lib/updates';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

export function UpdatesPanel({ info }: { info: UpdateInfo }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <>
      <div className="page-title"><div><h1>Aggiornamenti</h1><p>Versione installata {info.current}{info.commit && ` (commit ${info.commit})`} · canale <b>{info.channel === 'beta' ? 'beta' : 'stabile'}</b> · sorgente {info.repo}</p></div>
        <div className="actions"><button className="btn btn-outline" onClick={() => router.refresh()}>Ricontrolla</button><button className="btn btn-primary" disabled={pending || !info.deployHook} onClick={() => start(async () => { const r = await triggerDeployAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Aggiorna con un clic</button></div></div>
      <div className="admin-grid-2">
        <div>
          <div className={`panel ${info.upToDate ? '' : 'ext-card on'}`}>
            {info.error ? <><div className="panel-title">Controllo non riuscito</div><p className="help">{info.error}</p></> : info.upToDate ? <><div className="panel-title">✅ Sei aggiornato</div><p className="help">Ultima versione pubblicata il {formatDate(info.latestDate)}: «{info.latestMessage}».</p></> : <><div className="panel-title">⬆️ Aggiornamento disponibile</div><p>{info.behind !== null ? `${info.behind} novità` : 'Nuova versione'} dal {formatDate(info.latestDate)}: «{info.latestMessage}» (commit {info.latest}).</p></>}
          </div>
          <div className="panel"><div className="panel-title">Come funziona</div>
            <p className="help">ASTER News gira su Vercel: aggiornare significa ricostruire il sito dall&apos;ultima versione del codice. Con un <b>Deploy Hook</b> (Vercel → Project → Settings → Git → Deploy Hooks, ramo <code>main</code> per il canale stabile o <code>beta</code> per le anteprime) il pulsante qui sopra avvia il deploy; senza hook, il deploy parte comunque a ogni push su GitHub. Il database e i contenuti non vengono toccati: le migrazioni dello schema sono automatiche al primo avvio.</p>
            {!info.deployHook && <p className="help"><b>Deploy Hook non configurato</b>: incollalo in <Link href="/admin/impostazioni">Impostazioni → Sistema → Aggiornamenti</Link>.</p>}
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Canali</div><p className="help"><b>Stabile</b>: il ramo main, testato in CI (tipi, test unitari, build). <b>Beta</b>: il ramo beta con le funzioni in anteprima. Il canale si sceglie nelle Impostazioni e cambia il ramo controllato e usato dal Deploy Hook.</p></div>
          <div className="panel"><div className="panel-title">Prima di aggiornare</div><ul className="activity"><li><span>💾</span><div><Link href="/admin/backup">Fai un backup</Link> (o attiva quello automatico)</div></li><li><span>🩺</span><div>Controlla <Link href="/admin/errori">Errori e salute</Link> dopo il deploy</div></li><li><span>↩️</span><div>Per tornare indietro: Vercel → Deployments → «Promote to Production» sulla versione precedente</div></li></ul></div>
        </div>
      </div>
    </>
  );
}
