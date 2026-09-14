'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteUserAction, saveUserAction } from '@/lib/actions';
import { ROLE_LABELS, Role, User } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const ROLES: Role[] = ['admin', 'editor', 'author', 'contributor'];

export function UsersManager({ users, meId, counts }: { users: User[]; meId: string; counts: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<User | null>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => { const r = await saveUserAction(editing!); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); router.refresh(); } });
  return (
    <>
      <div className="page-title"><div><h1>Utenti e ruoli</h1><p>Redazione e permessi di accesso al CMS.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing({ id: '', name: '', email: '', role: 'author', avatar: '', bio: '', active: true, createdAt: '' })}>+ Nuovo utente</button></div></div>
      <div className="panel"><div className="panel-title">Permessi per ruolo</div>
        <div className="table-wrap" style={{ border: 0 }}><table className="table">
          <thead><tr><th>Ruolo</th><th>Articoli</th><th>Pubblicazione</th><th>Categorie / Tag</th><th>Commenti</th><th>Utenti / Impostazioni</th></tr></thead>
          <tbody>
            <tr><td><b>Amministratore</b></td><td>Tutti</td><td>✔</td><td>✔</td><td>✔</td><td>✔</td></tr>
            <tr><td><b>Caporedattore</b></td><td>Tutti</td><td>✔</td><td>✔</td><td>✔</td><td>—</td></tr>
            <tr><td><b>Redattore</b></td><td>Solo propri</td><td>✔ (propri)</td><td>Solo tag</td><td>—</td><td>—</td></tr>
            <tr><td><b>Collaboratore</b></td><td>Solo propri (bozza / revisione)</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
          </tbody></table></div>
      </div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Utente</th><th>Email</th><th>Ruolo</th><th>Articoli</th><th>Stato</th><th>Dal</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><div className="t-user"><img src={u.avatar} alt="" /><b>{u.name}</b></div></td><td>{u.email}</td>
              <td><span className="badge badge-gray">{ROLE_LABELS[u.role]}</span></td><td>{counts[u.id] ?? 0}</td>
              <td>{u.active ? <span className="badge badge-green">Attivo</span> : <span className="badge badge-red">Disattivato</span>}</td>
              <td style={{ color: 'var(--gray-600)' }}>{formatDate(u.createdAt, false)}</td>
              <td><div className="t-actions"><button className="icon-btn" onClick={() => setEditing({ ...u })}>✎</button>{u.id !== meId && <ActionButton className="icon-btn danger" confirm={`Eliminare ${u.name}?`} action={() => deleteUserAction(u.id)}>🗑</ActionButton>}</div></td>
            </tr>
          ))}
        </tbody></table></div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>{editing.id ? 'Modifica' : 'Nuovo'} utente</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Nome e cognome</label><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
            <div className="field"><label>Ruolo</label><select className="select" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
            <div className="field"><label>Bio</label><textarea className="textarea" style={{ minHeight: 60 }} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} /></div>
            <div className="field"><label>Avatar URL</label><input className="input" value={editing.avatar} onChange={(e) => setEditing({ ...editing, avatar: e.target.value })} /></div>
            <label className="switch"><input type="checkbox" checked={editing.active} disabled={editing.id === meId} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Account attivo</label>
            <p className="help" style={{ marginTop: 12 }}>Nella demo la password è uguale per tutti: <code>aster2026</code>.</p>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={!editing.name.trim() || !editing.email.trim() || pending} onClick={save}>Salva</button></div>
        </div></div>
      )}
    </>
  );
}
