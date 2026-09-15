'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteEditionAction, saveEditionAction } from '@/lib/actions-editions';
import type { Edition } from '@/lib/models';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

type Opt = { id: string; name: string };
const empty = (): Edition => ({ id: '', slug: '', name: '', domain: '', tagline: '', zoneId: '', categoryIds: [], theme: {}, logo: '', active: true, createdAt: '' });

export function EditionsManager({ editions, zones, categories, themes }: { editions: Edition[]; zones: Opt[]; categories: Opt[]; themes: Opt[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Edition | null>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => { const r = await saveEditionAction(editing!); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); router.refresh(); } });
  return (
    <>
      <div className="page-title"><div><h1>Edizioni (multi-testata)</h1><p>Una sola installazione, più siti: ogni edizione ha dominio, nome, tema e un filtro per zona o categorie. Gli articoli senza edizione compaiono ovunque.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing(empty())}>+ Nuova edizione</button></div></div>
      <div className="panel"><div className="panel-title">Come funziona</div><p className="help">1. Crea l&apos;edizione (es. «Milano Today» con dominio <code>milano.tuatestata.it</code> e zona Milano). 2. Aggiungi il dominio al progetto Vercel e punta il DNS. 3. Il sito rileva il dominio e mostra testata, tema e notizie filtrate. In sviluppo puoi provare un&apos;edizione aggiungendo l&apos;intestazione HTTP <code>X-Edition: slug</code>.</p></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Edizione</th><th>Dominio</th><th>Filtro</th><th>Tema</th><th>Stato</th><th></th></tr></thead>
        <tbody>
          {editions.map((e) => <tr key={e.id}><td><b>{e.name}</b><div className="t-sub">{e.tagline}</div></td><td><code>{e.domain || '—'}</code></td><td>{e.zoneId ? `zona ${zones.find((z) => z.id === e.zoneId)?.name ?? ''}` : ''}{e.categoryIds.length ? ` ${e.categoryIds.length} categorie` : ''}{!e.zoneId && !e.categoryIds.length && 'tutte le notizie'}</td><td>{e.theme.preset ? themes.find((t) => t.id === e.theme.preset)?.name : 'come il sito'}</td><td>{e.active ? <span className="badge badge-green">Attiva</span> : <span className="badge badge-gray">Spenta</span>}</td>
            <td><div className="t-actions"><button className="icon-btn" onClick={() => setEditing({ ...e })}>✎</button><ActionButton className="icon-btn danger" confirm={`Eliminare l'edizione ${e.name}?`} action={() => deleteEditionAction(e.id)}>🗑</ActionButton></div></td></tr>)}
          {editions.length === 0 && <tr><td colSpan={6} className="help">Nessuna edizione: il sito è a testata unica.</td></tr>}
        </tbody></table></div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>{editing.id ? 'Modifica' : 'Nuova'} edizione</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-row"><div className="field"><label>Nome testata</label><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="es. Milano Today" /></div><div className="field"><label>Dominio</label><input className="input" value={editing.domain} onChange={(e) => setEditing({ ...editing, domain: e.target.value })} placeholder="milano.tuatestata.it" /></div></div>
            <div className="form-row"><div className="field"><label>Payoff</label><input className="input" value={editing.tagline} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} /></div><div className="field"><label>Logo (URL immagine, facoltativo)</label><input className="input" value={editing.logo} onChange={(e) => setEditing({ ...editing, logo: e.target.value })} /></div></div>
            <div className="form-row">
              <div className="field"><label>Zona / città</label><select className="select" value={editing.zoneId} onChange={(e) => setEditing({ ...editing, zoneId: e.target.value })}><option value="">Nessun filtro per zona</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
              <div className="field"><label>Tema</label><select className="select" value={editing.theme.preset ?? ''} onChange={(e) => setEditing({ ...editing, theme: e.target.value ? { preset: e.target.value } : {} })}><option value="">Come il sito principale</option>{themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            </div>
            <div className="field"><label>Solo queste categorie (vuoto = tutte)</label><div className="chips">{categories.map((c) => { const on = editing.categoryIds.includes(c.id); return <button key={c.id} type="button" className={`chip ${on ? 'on' : ''}`} style={on ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => setEditing({ ...editing, categoryIds: on ? editing.categoryIds.filter((x) => x !== c.id) : [...editing.categoryIds, c.id] })}>{c.name}</button>; })}</div></div>
            <label className="switch"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Edizione attiva</label>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={pending || !editing.name.trim()} onClick={save}>Salva</button></div>
        </div></div>
      )}
    </>
  );
}
