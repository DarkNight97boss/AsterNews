'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteZoneAction, saveZoneAction } from '@/lib/actions';
import { ZONE_KIND_LABELS, Zone, ZoneKind } from '@/lib/models';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

export function ZonesManager({ zones, counts }: { zones: Zone[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [q, setQ] = useState(''); const [name, setName] = useState(''); const [kind, setKind] = useState<ZoneKind>('zona'); const [editing, setEditing] = useState<Zone | null>(null);
  const [pending, start] = useTransition();
  const save = (z: Zone) => start(async () => { const r = await saveZoneAction(z); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); setName(''); router.refresh(); } });
  const list = zones.filter((z) => z.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="page-title"><div><h1>Zone</h1><p>{zones.length} tra comuni e quartieri. Ogni articolo ed evento può essere collegato a una zona.</p></div></div>
      <div className="panel"><div className="panel-title">Nuova zona</div>
        <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); save({ id: '', slug: '', name, kind }); }}>
          <input className="input" style={{ maxWidth: 320 }} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="select" style={{ width: 200 }} value={kind} onChange={(e) => setKind(e.target.value as ZoneKind)}>{(Object.keys(ZONE_KIND_LABELS) as ZoneKind[]).map((k) => <option key={k} value={k}>{ZONE_KIND_LABELS[k]}</option>)}</select>
          <button className="btn btn-primary" type="submit" disabled={!name.trim() || pending}>Aggiungi</button>
        </form>
      </div>
      <div className="filters"><input className="input grow" placeholder="Cerca zona..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Slug</th><th>Articoli</th><th></th></tr></thead>
        <tbody>
          {list.map((z) => (
            <tr key={z.id}>
              <td className="t-title">{editing?.id === z.id ? <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: '' })} /> : z.name}</td>
              <td>{editing?.id === z.id ? <select className="select" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as ZoneKind })}>{(Object.keys(ZONE_KIND_LABELS) as ZoneKind[]).map((k) => <option key={k} value={k}>{ZONE_KIND_LABELS[k]}</option>)}</select> : ZONE_KIND_LABELS[z.kind]}</td>
              <td><code>/zone/{z.slug}</code></td><td>{counts[z.id] ?? 0}</td>
              <td><div className="t-actions">
                {editing?.id === z.id ? <><button className="btn btn-primary btn-sm" onClick={() => save(editing)}>Salva</button><button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Annulla</button></>
                  : <><button className="icon-btn" onClick={() => setEditing({ ...z })}>✎</button><ActionButton className="icon-btn danger" confirm={`Eliminare "${z.name}"?`} action={() => deleteZoneAction(z.id)}>🗑</ActionButton></>}
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
    </>
  );
}
