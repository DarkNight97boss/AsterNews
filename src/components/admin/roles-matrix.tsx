'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveRolePermissionsAction } from '@/lib/actions-system';
import { ROLE_LABELS, type Role } from '@/lib/models';
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Permission } from '@/lib/permissions';
import { toast } from '@/components/ui/toaster';

const ROLES: Role[] = ['admin', 'editor', 'author', 'contributor'];

/** Matrice permessi × ruolo modificabile (l'amministratore ha sempre tutto). */
export function RolesMatrix({ current }: { current: Record<string, string[]> }) {
  const router = useRouter(); const [m, setM] = useState<Record<string, string[]>>(current); const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  const has = (r: Role, p: Permission) => r === 'admin' || (m[r] ?? []).includes(p);
  const flip = (r: Role, p: Permission) => { if (r === 'admin') return; setM({ ...m, [r]: has(r, p) ? (m[r] ?? []).filter((x) => x !== p) : [...(m[r] ?? []), p] }); };
  return (
    <div className="panel"><div className="panel-title">Permessi per ruolo <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)}>{open ? 'Chiudi' : 'Personalizza'}</button></div>
      {!open ? <p className="help">Amministratore: tutto. Caporedattore: pubblica e gestisce contenuti e community. Redattore: scrive e pubblica i propri articoli. Collaboratore: propone bozze in revisione. Premi «Personalizza» per cambiare ogni singolo permesso.</p> : (
        <>
          <div className="table-wrap" style={{ border: 0 }}><table className="table matrix"><thead><tr><th>Permesso</th>{ROLES.map((r) => <th key={r}>{ROLE_LABELS[r]}</th>)}</tr></thead><tbody>
            {ALL_PERMISSIONS.map((p) => <tr key={p}><td>{PERMISSION_LABELS[p]}<div className="t-sub"><code>{p}</code></div></td>{ROLES.map((r) => <td key={r} style={{ textAlign: 'center' }}><input type="checkbox" checked={has(r, p)} disabled={r === 'admin'} onChange={() => flip(r, p)} /></td>)}</tr>)}
          </tbody></table></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveRolePermissionsAction(m); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva permessi</button><button className="btn btn-ghost btn-sm" onClick={() => setM(current)}>Annulla modifiche</button></div>
        </>
      )}
    </div>
  );
}
