'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteListingAction, saveListingAction, setListingStatusAction } from '@/lib/actions-listings';
import { LISTING_CATEGORIES, Listing, ListingsSettings } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const STATUS: Record<Listing['status'], { l: string; c: string }> = { pending: { l: 'Da approvare', c: 'badge-gray' }, published: { l: 'Pubblicato', c: 'badge-green' }, rejected: { l: 'Rifiutato', c: 'badge-red' }, expired: { l: 'Scaduto', c: 'badge-gray' } };

export function ListingsManager({ items, zones, status, settings }: { items: Listing[]; zones: { id: string; name: string }[]; status: string; settings: ListingsSettings }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Listing | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); });
  return (
    <>
      <div className="page-title"><div><h1>Annunci e necrologi</h1><p>Inserzioni dei lettori: annuncio {settings.priceAnnuncio > 0 ? `${settings.priceAnnuncio} €` : 'gratis'}, necrologio {settings.priceNecrologio > 0 ? `${settings.priceNecrologio} €` : 'gratis'}, durata {settings.days} giorni, {settings.moderation ? 'con approvazione' : 'pubblicazione immediata'}.</p></div>
        <div className="actions"><button className="btn btn-primary" onClick={() => setEditing({ id: '', kind: 'annuncio', title: '', body: '', image: '', category: LISTING_CATEGORIES[0], price: '', contactName: '', contactEmail: '', contactPhone: '', zoneId: '', status: 'published', paid: true, amount: 0, expiresAt: new Date(Date.now() + settings.days * 86400000).toISOString(), readerId: '', createdAt: '', publishedAt: new Date().toISOString(), extra: {} })}>+ Inserisci per un lettore</button></div></div>
      <div className="filters">{[['pending', 'Da approvare'], ['published', 'Pubblicati'], ['rejected', 'Rifiutati'], ['expired', 'Scaduti'], ['all', 'Tutti']].map(([v, l]) => <Link key={v} href={`/admin/annunci?stato=${v}`} className={`btn btn-sm ${status === v ? 'btn-dark' : 'btn-outline'}`}>{l}</Link>)}</div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Inserzione</th><th>Tipo</th><th>Contatto</th><th>Pagamento</th><th>Stato</th><th>Scade</th><th></th></tr></thead>
        <tbody>
          {items.map((l) => <tr key={l.id} style={{ opacity: pending ? .6 : 1 }}><td className="t-title"><b>{l.title}</b><div className="t-sub">{l.category}{l.zoneId && ` · ${zones.find((z) => z.id === l.zoneId)?.name ?? ''}`} · {formatDate(l.createdAt)}</div><div className="help" style={{ maxWidth: 420 }}>{l.body.slice(0, 140)}</div></td><td>{l.kind}</td><td>{l.contactName}<div className="t-sub">{l.contactEmail}{l.contactPhone && ` · ${l.contactPhone}`}</div></td><td>{l.amount > 0 ? (l.paid ? <span className="badge badge-green">{l.amount} € pagato</span> : <span className="badge badge-red">{l.amount} € da pagare</span>) : <span className="badge badge-gray">gratis</span>}</td><td><span className={`badge ${STATUS[l.status].c}`}>{STATUS[l.status].l}</span></td><td className="help">{l.expiresAt ? formatDate(l.expiresAt, false) : '—'}</td>
            <td><div className="t-actions">{l.status !== 'published' && <button className="btn btn-primary btn-sm" onClick={() => run(() => setListingStatusAction(l.id, 'published'))}>Pubblica</button>}{l.status === 'pending' && <button className="btn btn-outline btn-sm" onClick={() => run(() => setListingStatusAction(l.id, 'rejected'))}>Rifiuta</button>}<button className="icon-btn" onClick={() => setEditing({ ...l })}>✎</button><ActionButton className="icon-btn danger" confirm="Eliminare definitivamente?" action={() => deleteListingAction(l.id)}>🗑</ActionButton></div></td></tr>)}
          {items.length === 0 && <tr><td colSpan={7} className="help">Nessuna inserzione in questo elenco.</td></tr>}
        </tbody></table></div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>{editing.id ? 'Modifica' : 'Nuova'} inserzione</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-row"><div className="field"><label>Tipo</label><select className="select" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as Listing['kind'] })}><option value="annuncio">Annuncio</option><option value="necrologio">Necrologio</option></select></div><div className="field"><label>Titolo</label><input className="input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div></div>
            <div className="field"><label>Testo</label><textarea className="textarea" style={{ minHeight: 120 }} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
            {editing.kind === 'annuncio' ? <div className="form-row"><div className="field"><label>Categoria</label><select className="select" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{LISTING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div><div className="field"><label>Prezzo</label><input className="input" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></div></div>
              : <div className="form-row"><div className="field"><label>Data (es. 12 settembre 2026)</label><input className="input" value={editing.extra.date ?? ''} onChange={(e) => setEditing({ ...editing, extra: { ...editing.extra, date: e.target.value } })} /></div><div className="field"><label>Esequie</label><input className="input" value={editing.extra.funeral ?? ''} onChange={(e) => setEditing({ ...editing, extra: { ...editing.extra, funeral: e.target.value } })} /></div></div>}
            <div className="form-row"><div className="field"><label>Zona</label><select className="select" value={editing.zoneId} onChange={(e) => setEditing({ ...editing, zoneId: e.target.value })}><option value="">—</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div><div className="field"><label>Immagine (URL)</label><input className="input" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></div></div>
            <div className="form-row"><div className="field"><label>Nome contatto</label><input className="input" value={editing.contactName} onChange={(e) => setEditing({ ...editing, contactName: e.target.value })} /></div><div className="field"><label>Email</label><input className="input" value={editing.contactEmail} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} /></div><div className="field"><label>Telefono</label><input className="input" value={editing.contactPhone} onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })} /></div></div>
            <div className="form-row"><div className="field"><label>Stato</label><select className="select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Listing['status'] })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select></div><div className="field"><label>&nbsp;</label><label className="checkbox"><input type="checkbox" checked={editing.paid} onChange={(e) => setEditing({ ...editing, paid: e.target.checked })} /> Pagato</label></div></div>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={pending || !editing.title.trim()} onClick={() => run(async () => { const r = await saveListingAction(editing); if (r.ok) setEditing(null); return r; })}>Salva</button></div>
        </div></div>
      )}
    </>
  );
}
