'use client';

import { useState, useTransition } from 'react';
import { saveEditionUsersAction } from '@/lib/actions-system';
import { toast } from '@/components/ui/toaster';

/** Redazioni distinte per edizione: chi è assegnato vede in «Articoli» solo la propria edizione (l'amministratore vede tutto). */
export function EditionUsers({ editions, users, initial }: { editions: { id: string; name: string }[]; users: { id: string; name: string; role: string }[]; initial: Record<string, string[]> }) {
  const [map, setMap] = useState(initial); const [pending, start] = useTransition();
  if (!editions.length) return null;
  const toggle = (eid: string, uid: string) => { const cur = map[eid] ?? []; setMap({ ...map, [eid]: cur.includes(uid) ? cur.filter((x) => x !== uid) : [...cur, uid] }); };
  return (
    <div className="panel"><div className="panel-title">Redazioni per edizione <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveEditionUsersAction(map); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva</button></div>
      {editions.map((e) => <div key={e.id} style={{ marginBottom: 10 }}><b>{e.name}</b><div className="chips" style={{ marginTop: 4 }}>{users.map((u) => <button key={u.id} type="button" className="chip chip-btn" style={(map[e.id] ?? []).includes(u.id) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => toggle(e.id, u.id)}>{u.name}</button>)}</div></div>)}
      <p className="help">Gli abbonati e gli iscritti alla newsletter restano per edizione tramite le liste newsletter e i piani; i redattori assegnati a una sola edizione lavorano solo su quella.</p>
    </div>
  );
}
