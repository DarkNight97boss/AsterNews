'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteAdAction, saveAdAction } from '@/lib/actions-listings';
import { AD_SLOTS, Ad } from '@/lib/models';
import { formatDate, toLocalInput } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const empty = (): Ad => ({ id: '', slot: 'sidebar_300', name: '', type: 'image', image: '', url: '', html: '', label: '', startAt: null, endAt: null, weight: 1, impressions: 0, clicks: 0, active: true, createdAt: '' });

export function AdsManager({ ads, adsense }: { ads: Ad[]; adsense: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Ad | null>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => { const r = await saveAdAction(editing!); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); router.refresh(); } });
  const ctr = (a: Ad) => (a.impressions ? `${((a.clicks / a.impressions) * 100).toFixed(2)}%` : '—');
  return (
    <>
      <div className="page-title"><div><h1>Pubblicità</h1><p>Annunci propri (immagine o HTML) per posizione, con periodo, peso, impressioni e clic. {adsense ? 'AdSense attivo negli spazi liberi.' : 'AdSense non configurato (Impostazioni → Pubblicità).'}</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing(empty())}>+ Nuovo annuncio</button></div></div>
      <div className="panel"><div className="panel-title">Posizioni disponibili</div><div className="chips">{AD_SLOTS.map((s) => <span key={s.id} className="chip">{s.name} <small style={{ opacity: .7 }}>{s.size}</small></span>)}</div></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Annuncio</th><th>Posizione</th><th>Periodo</th><th style={{ textAlign: 'right' }}>Impressioni</th><th style={{ textAlign: 'right' }}>Clic</th><th>CTR</th><th>Stato</th><th></th></tr></thead>
        <tbody>
          {ads.map((a) => <tr key={a.id}><td><div className="t-user">{a.image && <img src={a.image} alt="" style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 3 }} />}<div><b>{a.name}</b><div className="t-sub">{a.type} · peso {a.weight}</div></div></div></td><td>{AD_SLOTS.find((s) => s.id === a.slot)?.name ?? a.slot}</td><td className="help">{a.startAt ? formatDate(a.startAt, false) : '—'} → {a.endAt ? formatDate(a.endAt, false) : '∞'}</td><td style={{ textAlign: 'right' }}>{a.impressions.toLocaleString('it-IT')}</td><td style={{ textAlign: 'right' }}>{a.clicks.toLocaleString('it-IT')}</td><td>{ctr(a)}</td><td>{a.active ? <span className="badge badge-green">Attivo</span> : <span className="badge badge-gray">Spento</span>}</td><td><div className="t-actions"><button className="icon-btn" onClick={() => setEditing({ ...a })}>✎</button><ActionButton className="icon-btn danger" confirm="Eliminare questo annuncio?" action={() => deleteAdAction(a.id)}>🗑</ActionButton></div></td></tr>)}
          {ads.length === 0 && <tr><td colSpan={8} className="help">Nessun annuncio: gli spazi mostrano AdSense (se configurato) o il segnaposto.</td></tr>}
        </tbody></table></div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>{editing.id ? 'Modifica' : 'Nuovo'} annuncio</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-row"><div className="field"><label>Nome (interno)</label><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div><div className="field"><label>Posizione</label><select className="select" value={editing.slot} onChange={(e) => setEditing({ ...editing, slot: e.target.value })}>{AD_SLOTS.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.size})</option>)}</select></div></div>
            <div className="form-row"><div className="field"><label>Tipo</label><select className="select" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Ad['type'] })}><option value="image">Immagine con link</option><option value="html">Codice HTML (tag di terze parti)</option></select></div><div className="field"><label>Etichetta (vuota = "Pubblicità")</label><input className="input" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Contenuto sponsorizzato" /></div></div>
            {editing.type === 'image' ? <><div className="field"><label>URL immagine</label><input className="input" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="https://" /></div><div className="field"><label>Link di destinazione</label><input className="input" value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://" /></div></> : <div className="field"><label>HTML</label><textarea className="textarea" style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 120 }} value={editing.html} onChange={(e) => setEditing({ ...editing, html: e.target.value })} /></div>}
            <div className="form-row"><div className="field"><label>Dal</label><input className="input" type="datetime-local" value={toLocalInput(editing.startAt)} onChange={(e) => setEditing({ ...editing, startAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div><div className="field"><label>Al</label><input className="input" type="datetime-local" value={toLocalInput(editing.endAt)} onChange={(e) => setEditing({ ...editing, endAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div><div className="field"><label>Peso (rotazione)</label><input className="input" type="number" min={1} max={100} value={editing.weight} onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) || 1 })} /></div></div>
            <label className="switch"><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Attivo</label>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={pending || !editing.name.trim()} onClick={save}>Salva</button></div>
        </div></div>
      )}
    </>
  );
}
