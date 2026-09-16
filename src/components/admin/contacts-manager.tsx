'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteContactAction, saveContactAction } from '@/lib/actions-workflow';
import type { Contact } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const blank = (): Contact => ({ id: '', name: '', role: '', org: '', phone: '', email: '', notes: '', tags: '', createdBy: '', updatedAt: '' });
/** Rubrica condivisa di fonti e contatti della redazione. */
export function ContactsManager({ contacts, query, meId }: { contacts: Contact[]; query: string; meId: string }) {
  const router = useRouter(); const [c, setC] = useState<Contact | null>(null); const [q, setQ] = useState(query); const [pending, start] = useTransition();
  return (
    <>
      <div className="page-title"><div><h1>Rubrica contatti</h1><p>Fonti, uffici stampa, istituzioni: condivisa con tutta la redazione.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setC(blank())}>+ Nuovo contatto</button></div></div>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); router.push(q ? `/admin/contatti?q=${encodeURIComponent(q)}` : '/admin/contatti'); }}><input className="input grow" placeholder="Cerca per nome, ente, ruolo, tag…" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-outline btn-sm">Cerca</button></form>
      <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>Ruolo / Ente</th><th>Telefono</th><th>Email</th><th>Tag</th><th>Aggiornato</th><th></th></tr></thead><tbody>
        {contacts.map((x) => <tr key={x.id}><td className="t-title"><a href="#" onClick={(e) => { e.preventDefault(); setC({ ...x }); }}>{x.name}</a>{x.notes && <div className="t-sub">{x.notes.slice(0, 80)}</div>}</td><td>{x.role}{x.role && x.org ? ' · ' : ''}{x.org}</td><td><a href={`tel:${x.phone}`}>{x.phone}</a></td><td><a href={`mailto:${x.email}`}>{x.email}</a></td><td className="help">{x.tags}</td><td className="help">{formatDate(x.updatedAt, false)}</td><td><div className="t-actions"><button className="icon-btn" onClick={() => setC({ ...x })}>✎</button>{(x.createdBy === meId) && <ActionButton className="icon-btn danger" confirm={`Eliminare ${x.name}?`} action={() => deleteContactAction(x.id)}>🗑</ActionButton>}</div></td></tr>)}
        {contacts.length === 0 && <tr><td colSpan={7} className="help">Nessun contatto.</td></tr>}
      </tbody></table></div>
      {c && <div className="modal-backdrop" onClick={() => setC(null)}><div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{c.id ? 'Modifica contatto' : 'Nuovo contatto'}</h3><button className="icon-btn" onClick={() => setC(null)}>✕</button></div>
        <div className="modal-body">
          <div className="field"><label>Nome</label><input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></div>
          <div className="form-row"><div className="field"><label>Ruolo</label><input className="input" value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })} placeholder="Portavoce, assessore…" /></div><div className="field"><label>Ente / azienda</label><input className="input" value={c.org} onChange={(e) => setC({ ...c, org: e.target.value })} /></div></div>
          <div className="form-row"><div className="field"><label>Telefono</label><input className="input" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></div><div className="field"><label>Email</label><input className="input" type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} /></div></div>
          <div className="field"><label>Tag (separati da virgola)</label><input className="input" value={c.tags} onChange={(e) => setC({ ...c, tags: e.target.value })} placeholder="comune, sanità, sport" /></div>
          <div className="field"><label>Note</label><textarea className="textarea" style={{ minHeight: 70 }} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} placeholder="Disponibilità, argomenti, come citarlo…" /></div>
        </div>
        <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setC(null)}>Annulla</button><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveContactAction(c); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setC(null); router.refresh(); } })}>Salva</button></div>
      </div></div>}
    </>
  );
}
