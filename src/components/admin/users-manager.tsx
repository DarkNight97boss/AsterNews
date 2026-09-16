'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteUserAction, saveUserAction } from '@/lib/actions';
import { adminDisableTotpAction, adminResetLinkAction, adminRevokeSessionsAction, adminSetPasswordAction } from '@/lib/actions-auth';
import { ROLE_LABELS, Role, User } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { RolesMatrix } from './roles-matrix';

const ROLES: Role[] = ['admin', 'editor', 'author', 'contributor'];

export function UsersManager({ users, meId, counts, rolePerms }: { users: User[]; meId: string; counts: Record<string, number>; rolePerms: Record<string, string[]> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<User | null>(null);
  const [pwUser, setPwUser] = useState<User | null>(null); const [newPw, setNewPw] = useState(''); const [link, setLink] = useState('');
  const [pending, start] = useTransition();
  const save = () => start(async () => { const r = await saveUserAction(editing!); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); router.refresh(); } });
  return (
    <>
      <div className="page-title"><div><h1>Utenti e ruoli</h1><p>Redazione e permessi di accesso al CMS.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing({ id: '', name: '', email: '', role: 'author', avatar: '', bio: '', active: true, createdAt: '' })}>+ Nuovo utente</button></div></div>
      <RolesMatrix current={rolePerms} />
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Utente</th><th>Email</th><th>Ruolo</th><th>Articoli</th><th>Stato</th><th>Sicurezza</th><th>Dal</th><th></th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td><div className="t-user"><img src={u.avatar} alt="" /><b>{u.name}</b></div></td><td>{u.email}</td>
              <td><span className="badge badge-gray">{ROLE_LABELS[u.role]}</span></td><td>{counts[u.id] ?? 0}</td>
              <td>{u.active ? <span className="badge badge-green">Attivo</span> : <span className="badge badge-red">Disattivato</span>}</td>
              <td style={{ fontSize: 12 }}>{u.hasPassword ? <span className="badge badge-gray">password</span> : <span className="badge badge-red" title="Nessuna password: non può accedere">senza password</span>} {u.totpEnabled && <span className="badge badge-green">2FA</span>}<div className="help">{u.lastLogin ? `ultimo accesso ${formatDate(u.lastLogin)}` : 'mai entrato'}</div></td>
              <td style={{ color: 'var(--gray-600)' }}>{formatDate(u.createdAt, false)}</td>
              <td><div className="t-actions"><button className="icon-btn" onClick={() => setEditing({ ...u })}>✎</button><button className="icon-btn" title="Password e accesso" onClick={() => { setPwUser(u); setNewPw(''); setLink(''); }}>🔑</button>{u.id !== meId && <ActionButton className="icon-btn danger" confirm={`Eliminare ${u.name}?`} action={() => deleteUserAction(u.id)}>🗑</ActionButton>}</div></td>
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
            <p className="help" style={{ marginTop: 12 }}>La password si imposta dal pulsante 🔑 nella tabella, oppure l&apos;utente riceve un link per sceglierla.</p>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={!editing.name.trim() || !editing.email.trim() || pending} onClick={save}>Salva</button></div>
        </div></div>
      )}
      {pwUser && (
        <div className="modal-backdrop" onClick={() => setPwUser(null)}><div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>Accesso di {pwUser.name}</h3><button className="icon-btn" onClick={() => setPwUser(null)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Imposta una password temporanea</label><div style={{ display: 'flex', gap: 8 }}><input className="input" type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="almeno 10 caratteri" /><button className="btn btn-primary btn-sm" disabled={pending || newPw.length < 10} onClick={() => start(async () => { const r = await adminSetPasswordAction(pwUser.id, newPw, true); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setNewPw(''); router.refresh(); } })}>Imposta</button></div><div className="help">Al primo accesso l&apos;utente dovrà cambiarla.</div></div>
            <div className="field"><label>Oppure link per scegliere la password (24 ore)</label><button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await adminResetLinkAction(pwUser.id); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.link) setLink(r.link); })}>Genera link</button>{link && <input className="input" style={{ marginTop: 8 }} readOnly value={link} onClick={(e) => { (e.target as HTMLInputElement).select(); navigator.clipboard?.writeText(link).then(() => toast.info('Link copiato')); }} />}<div className="help">Se il servizio email è configurato il link viene anche inviato all&apos;utente.</div></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {pwUser.totpEnabled && <ActionButton className="btn btn-outline btn-sm" confirm="Disattivare la verifica in due passaggi di questo utente?" action={() => adminDisableTotpAction(pwUser.id)} onDone={() => router.refresh()}>Disattiva 2FA</ActionButton>}
              <ActionButton className="btn btn-outline btn-sm" confirm="Chiudere tutte le sessioni aperte di questo utente?" action={() => adminRevokeSessionsAction(pwUser.id)}>Chiudi sessioni</ActionButton>
            </div>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setPwUser(null)}>Chiudi</button></div>
        </div></div>
      )}
    </>
  );
}
