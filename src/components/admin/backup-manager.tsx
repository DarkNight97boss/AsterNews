'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { afterRestoreAction, createBackupAction, deleteBackupAction, pruneBackupsAction } from '@/lib/actions-backup';
import type { BackupEntry } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const size = (b: number) => (b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);

export function BackupManager({ backups, counts, auto, remote, storage }: { backups: BackupEntry[]; counts: Record<string, number>; auto: { enabled: boolean; keep: number }; remote: boolean; storage: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [restoring, setRestoring] = useState<string>('');
  const restore = async (file: File) => {
    if (!confirm('Il ripristino SOSTITUISCE tutti i contenuti attuali con quelli del file. Continuare?')) return;
    setRestoring('Caricamento…');
    try {
      const r = await fetch('/api/backup/restore', { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Errore');
      await afterRestoreAction();
      toast.success(`Ripristinate ${d.rows} righe in ${d.tables} tabelle.`); router.refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setRestoring(''); }
  };
  return (
    <>
      <div className="page-title"><div><h1>Backup ed esportazione</h1><p>Database: {remote ? 'Postgres remoto (Supabase)' : 'PGlite locale'} · immagini: {storage}. Backup automatico {auto.enabled ? `attivo (ultimi ${auto.keep} conservati)` : 'spento'} — si imposta nelle Impostazioni.</p></div>
        <div className="actions"><a className="btn btn-outline" href="/api/backup/export" download>Scarica esportazione JSON</a><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await createBackupAction(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Crea backup adesso</button></div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Backup salvati <ActionButton className="btn btn-ghost btn-sm" action={() => pruneBackupsAction(auto.keep)}>Conserva solo gli ultimi {auto.keep}</ActionButton></div>
            <table className="table"><thead><tr><th>Quando</th><th>Dimensione</th><th>Dove</th><th>Nota</th><th></th></tr></thead><tbody>
              {backups.map((b) => <tr key={b.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(b.createdAt)}</td><td>{size(b.size)}</td><td>{b.url.startsWith('https://') ? <a href={b.url} target="_blank" rel="noopener">storage ↗</a> : b.url.startsWith('supabase://') ? 'Supabase Storage (bucket backup)' : <a href="/api/backup/export?last=1" download>database ↓</a>}</td><td className="help">{b.note}</td><td><ActionButton className="icon-btn danger" confirm="Rimuovere questo backup dall'elenco?" action={() => deleteBackupAction(b.id)}>🗑</ActionButton></td></tr>)}
              {backups.length === 0 && <tr><td colSpan={5} className="help">Nessun backup ancora. Crea il primo o attiva il backup automatico giornaliero.</td></tr>}
            </tbody></table>
          </div>
          <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}><div className="panel-title">Ripristino</div>
            <p className="help">Carica un file di esportazione (.json o .json.gz) creato da ASTER News. Tutti i contenuti attuali vengono sostituiti: fai prima un backup.</p>
            <label className="btn btn-danger btn-sm">{restoring || 'Scegli file e ripristina'}<input type="file" accept=".json,.gz,application/json,application/gzip" hidden disabled={!!restoring} onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); }} /></label>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Contenuto del database</div>
            <table className="table"><tbody>{Object.entries(counts).map(([t, n]) => <tr key={t}><td>{t}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{n.toLocaleString('it-IT')}</td></tr>)}</tbody></table>
          </div>
          <div className="panel"><div className="panel-title">Ripristino a un punto nel tempo</div><p className="help">Su Supabase il ripristino a un istante preciso (Point-in-Time Recovery) è un&apos;opzione del piano Pro: si attiva dalla dashboard Supabase in Database → Backups. I backup di ASTER News sono comunque scaricabili e riutilizzabili su qualsiasi installazione.</p></div>
        </div>
      </div>
    </>
  );
}
