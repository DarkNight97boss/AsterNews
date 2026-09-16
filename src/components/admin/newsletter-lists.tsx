'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteNewsletterListAction, previewListAction, saveNewsletterListAction, sendListNowAction, sendListTestAction } from '@/lib/actions-newsletter';
import type { Newsletter, NewsletterBlock, NewsletterSend } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

type Opt = { id: string; name: string };
const DAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const BLOCK_LABEL: Record<NewsletterBlock['type'], string> = { header: 'Intestazione', text: 'Testo libero', articles: 'Articoli', image: 'Immagine', button: 'Pulsante', divider: 'Separatore', events: 'Eventi', weather: 'Meteo' };
const uid = () => 'b' + Math.random().toString(36).slice(2, 8);
const empty = (): Newsletter => ({ id: '', slug: '', name: '', description: '', kind: 'digest', config: { hours: 24 }, blocks: [{ id: uid(), type: 'header', title: 'Le notizie di oggi', text: '' }, { id: uid(), type: 'articles', title: 'Da leggere', filter: { limit: 6, hours: 24 }, layout: 'list' }, { id: uid(), type: 'button', title: 'Tutte le notizie', url: '/' }], schedule: { hour: 7, days: [1, 2, 3, 4, 5], enabled: false }, enabled: true, isDefault: false, createdAt: '' });

export function NewsletterLists({ lists, counts, sends, categories, zones, mailConfigured, myEmail }: { lists: Newsletter[]; counts: Record<string, number>; sends: NewsletterSend[]; categories: Opt[]; zones: Opt[]; mailConfigured: boolean; myEmail: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Newsletter | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { after?.(); router.refresh(); } });
  const e = editing;
  const setBlock = (id: string, patch: Partial<NewsletterBlock>) => e && setEditing({ ...e, blocks: e.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  const drop = (target: string) => { if (!e || !drag || drag === target) return; const from = e.blocks.findIndex((b) => b.id === drag); const to = e.blocks.findIndex((b) => b.id === target); const n = [...e.blocks]; const [m] = n.splice(from, 1); n.splice(to, 0, m); setEditing({ ...e, blocks: n }); setDrag(null); };
  const rate = (s: NewsletterSend) => (s.recipients ? `${Math.round(((s.opens ?? 0) / s.recipients) * 100)}% aperture · ${Math.round(((s.clicks ?? 0) / s.recipients) * 100)}% clic` : '—');
  return (
    <>
      <div className="page-title"><div><h1>Liste newsletter</h1><p>Più newsletter con contenuti, orari e iscritti diversi: mattino, sera, per zona, per argomento. Ogni lista ha il suo editor a blocchi. <Link href="/admin/newsletter">← Iscritti e invii</Link></p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing(empty())}>+ Nuova lista</button></div></div>
      {!mailConfigured && <div className="lock-banner">✉️ Servizio email non configurato: gli invii non partiranno finché non inserisci la chiave nelle Impostazioni.</div>}
      <div className="admin-grid-2">
        <div>
          {lists.map((l) => (
            <div key={l.id} className="panel"><div className="panel-title">{l.name} {l.isDefault && <span className="badge badge-green">predefinita</span>} {!l.enabled && <span className="badge badge-gray">spenta</span>}</div>
              <p className="help">{l.description || '—'} · {counts[l.id] ?? 0} iscritti · {l.schedule.enabled ? `automatica alle ${l.schedule.hour}:00 (${l.schedule.days.map((d) => DAYS[d]).join(', ')})` : 'invio manuale'} · {l.blocks.length} blocchi</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...l })}>Modifica</button>
                <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => setPreview(await previewListAction(l.id)))}>Anteprima</button>
                <button className="btn btn-outline btn-sm" disabled={pending || !mailConfigured} onClick={() => run(() => sendListTestAction(l.id, myEmail))}>Prova a me</button>
                <button className="btn btn-primary btn-sm" disabled={pending || !mailConfigured || !(counts[l.id] ?? 0)} onClick={() => { if (confirm(`Inviare «${l.name}» a ${counts[l.id] ?? 0} iscritti?`)) run(() => sendListNowAction(l.id)); }}>Invia ora</button>
                {!l.isDefault && <ActionButton className="btn btn-ghost btn-sm" confirm="Eliminare la lista e le sue iscrizioni?" action={() => deleteNewsletterListAction(l.id)}>Elimina</ActionButton>}
              </div>
            </div>
          ))}
          {preview && <div className="panel"><div className="panel-title">Anteprima <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>Chiudi</button></div><iframe title="Anteprima" srcDoc={preview} style={{ width: '100%', height: 560, border: '1px solid var(--gray-200)', borderRadius: 6 }} /></div>}
        </div>
        <div className="panel"><div className="panel-title">Statistiche degli invii</div>
          <table className="table"><thead><tr><th>Quando</th><th>Lista / oggetto</th><th style={{ textAlign: 'right' }}>Inviate</th><th>Risultati</th></tr></thead><tbody>
            {sends.map((s) => <tr key={s.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.sentAt)}</td><td><b>{lists.find((l) => l.id === s.listId)?.name ?? '—'}</b><div className="t-sub">{s.subject}</div></td><td style={{ textAlign: 'right' }}>{s.recipients}</td><td className="help">{s.status === 'sent' ? rate(s) : <span className="badge badge-red">fallita</span>}</td></tr>)}
            {sends.length === 0 && <tr><td colSpan={4} className="help">Nessun invio ancora. Aperture e clic si aggiornano man mano che i lettori aprono le email.</td></tr>}
          </tbody></table>
        </div>
      </div>
      {e && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal modal-lg" onClick={(ev) => ev.stopPropagation()}>
          <div className="modal-head"><h3>{e.id ? 'Modifica' : 'Nuova'} lista</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-row"><div className="field"><label>Nome</label><input className="input" value={e.name} onChange={(ev) => setEditing({ ...e, name: ev.target.value })} placeholder="es. Buonasera, le notizie della sera" /></div><div className="field"><label>Descrizione (mostrata nel modulo di iscrizione)</label><input className="input" value={e.description} onChange={(ev) => setEditing({ ...e, description: ev.target.value })} /></div></div>
            <div className="form-row">
              <div className="field"><label>Oggetto fisso (vuoto = titolo dell&apos;apertura)</label><input className="input" value={e.config.subject ?? ''} onChange={(ev) => setEditing({ ...e, config: { ...e.config, subject: ev.target.value } })} /></div>
              <div className="field"><label>Solo categoria</label><select className="select" value={e.config.categoryId ?? ''} onChange={(ev) => setEditing({ ...e, config: { ...e.config, categoryId: ev.target.value || undefined } })}><option value="">Tutte</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div className="field"><label>Solo zona</label><select className="select" value={e.config.zoneId ?? ''} onChange={(ev) => setEditing({ ...e, config: { ...e.config, zoneId: ev.target.value || undefined } })}><option value="">Tutte</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            </div>
            <div className="form-row" style={{ alignItems: 'end' }}>
              <div className="field"><label className="switch"><input type="checkbox" checked={e.schedule.enabled} onChange={(ev) => setEditing({ ...e, schedule: { ...e.schedule, enabled: ev.target.checked } })} /> Invio automatico</label></div>
              <div className="field"><label>Ora (Italia)</label><select className="select" value={e.schedule.hour} onChange={(ev) => setEditing({ ...e, schedule: { ...e.schedule, hour: Number(ev.target.value) } })}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></div>
              <div className="field"><label>Giorni</label><div className="chips">{DAYS.map((d, i) => <button key={d} type="button" className="chip" style={e.schedule.days.includes(i) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => setEditing({ ...e, schedule: { ...e.schedule, days: e.schedule.days.includes(i) ? e.schedule.days.filter((x) => x !== i) : [...e.schedule.days, i] } })}>{d}</button>)}</div></div>
            </div>
            <div className="field"><label>Blocchi (trascina per riordinare)</label>
              <div className="nl-blocks">
                {e.blocks.map((b) => (
                  <div key={b.id} className={`nl-block ${drag === b.id ? 'dragging' : ''}`} draggable onDragStart={() => setDrag(b.id)} onDragOver={(ev) => ev.preventDefault()} onDrop={() => drop(b.id)}>
                    <div className="nl-block-head"><span>⋮⋮ {BLOCK_LABEL[b.type]}</span><button type="button" className="icon-btn danger" onClick={() => setEditing({ ...e, blocks: e.blocks.filter((x) => x.id !== b.id) })}>✕</button></div>
                    {(b.type === 'header' || b.type === 'articles' || b.type === 'button' || b.type === 'events') && <input className="input" placeholder="Titolo" value={b.title ?? ''} onChange={(ev) => setBlock(b.id, { title: ev.target.value })} />}
                    {(b.type === 'header' || b.type === 'text') && <textarea className="textarea" style={{ minHeight: 56 }} placeholder={b.type === 'text' ? 'Testo o HTML' : 'Sottotitolo'} value={b.text ?? ''} onChange={(ev) => setBlock(b.id, { text: ev.target.value })} />}
                    {(b.type === 'image' || b.type === 'button') && <input className="input" placeholder={b.type === 'image' ? 'URL immagine' : 'Link (es. / oppure https://…)'} value={b.type === 'image' ? b.image ?? '' : b.url ?? ''} onChange={(ev) => setBlock(b.id, b.type === 'image' ? { image: ev.target.value } : { url: ev.target.value })} />}
                    {b.type === 'image' && <input className="input" placeholder="Link al clic (facoltativo)" value={b.url ?? ''} onChange={(ev) => setBlock(b.id, { url: ev.target.value })} />}
                    {b.type === 'articles' && <div className="form-row"><div className="field"><label>Quanti</label><input className="input" type="number" min={1} max={20} value={b.filter?.limit ?? 6} onChange={(ev) => setBlock(b.id, { filter: { ...b.filter, limit: Number(ev.target.value) } })} /></div><div className="field"><label>Ultime ore</label><input className="input" type="number" min={1} max={720} value={b.filter?.hours ?? 24} onChange={(ev) => setBlock(b.id, { filter: { ...b.filter, hours: Number(ev.target.value) } })} /></div><div className="field"><label>Categoria</label><select className="select" value={b.filter?.categoryId ?? ''} onChange={(ev) => setBlock(b.id, { filter: { ...b.filter, categoryId: ev.target.value || undefined } })}><option value="">Tutte</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Aspetto</label><select className="select" value={b.layout ?? 'list'} onChange={(ev) => setBlock(b.id, { layout: ev.target.value as 'list' | 'cards' })}><option value="list">Elenco</option><option value="cards">Card con foto</option></select></div><div className="field"><label>&nbsp;</label><label className="checkbox"><input type="checkbox" checked={!!b.filter?.featured} onChange={(ev) => setBlock(b.id, { filter: { ...b.filter, featured: ev.target.checked } })} /> Solo in evidenza</label></div></div>}
                  </div>
                ))}
              </div>
              <div className="chips" style={{ marginTop: 8 }}>{(Object.keys(BLOCK_LABEL) as NewsletterBlock['type'][]).map((t) => <button key={t} type="button" className="chip" onClick={() => setEditing({ ...e, blocks: [...e.blocks, { id: uid(), type: t, ...(t === 'articles' ? { filter: { limit: 6, hours: 24 }, layout: 'list' as const } : {}) }] })}>+ {BLOCK_LABEL[t]}</button>)}</div>
            </div>
            <div className="form-row"><label className="switch"><input type="checkbox" checked={e.enabled} onChange={(ev) => setEditing({ ...e, enabled: ev.target.checked })} /> Lista attiva</label><label className="switch"><input type="checkbox" checked={e.isDefault} onChange={(ev) => setEditing({ ...e, isDefault: ev.target.checked })} /> Lista predefinita (iscrizione dal sito)</label></div>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={pending || !e.name.trim()} onClick={() => run(() => saveNewsletterListAction(e), () => setEditing(null))}>Salva lista</button></div>
        </div></div>
      )}
    </>
  );
}
