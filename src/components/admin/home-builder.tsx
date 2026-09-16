'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { applyLayoutPresetAction, importLayoutAction, saveHomeBlocksAction } from '@/lib/actions-system';
import type { Category, HomeBlock, Tag, Zone } from '@/lib/models';
import { BLOCK_TYPES, LAYOUTS, LAYOUT_PRESETS } from '@/lib/layout-library';
import { uid } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

/** Builder visuale della home: blocchi trascinabili, ogni blocco con fonte, layout e numero di articoli; libreria di layout pronti; esporta/importa JSON. */
export function HomeBuilder({ initial, categories, tags, zones, exportJson }: { initial: HomeBlock[]; categories: Category[]; tags: Tag[]; zones: Zone[]; exportJson: string }) {
  const router = useRouter(); const [blocks, setBlocks] = useState<HomeBlock[]>(initial); const [drag, setDrag] = useState<string | null>(null); const [pending, start] = useTransition(); const [imp, setImp] = useState('');
  const upd = (id: string, p: Partial<HomeBlock>) => setBlocks(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const drop = (target: string) => { if (!drag || drag === target) return; const from = blocks.findIndex((b) => b.id === drag); const to = blocks.findIndex((b) => b.id === target); const n = [...blocks]; const [m] = n.splice(from, 1); n.splice(to, 0, m); setBlocks(n); setDrag(null); };
  const sourceOptions = (t: HomeBlock['type']) => t === 'category' ? [{ id: '*', name: 'Tutte le categorie in home' }, ...categories.map((c) => ({ id: c.id, name: c.name }))] : t === 'tag' ? tags.map((x) => ({ id: x.id, name: x.name })) : t === 'zone' ? [{ id: '*', name: 'Tutte le zone' }, ...zones.map((z) => ({ id: z.id, name: z.name }))] : t === 'format' ? [{ id: 'video', name: 'Video' }, { id: 'gallery', name: 'Fotogallery' }, { id: 'live', name: 'Dirette' }] : [];
  return (
    <>
      <div className="page-title"><div><h1>Builder della home</h1><p>Trascina i blocchi, scegli la fonte di ognuno. L&apos;apertura (articoli in evidenza) resta in cima; qui componi tutto ciò che viene dopo.</p></div><div className="actions"><a className="btn btn-outline" href="/" target="_blank" rel="noreferrer">Anteprima ↗</a><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveHomeBlocksAction(blocks); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva home</button></div></div>
      <div className="admin-grid-2">
        <div>
          {blocks.length === 0 && <div className="panel help">Nessun blocco: la home usa le sezioni delle categorie (Impostazioni → Generale). Aggiungi un blocco o applica un layout dalla libreria.</div>}
          {blocks.map((b) => <div key={b.id} className={`hb-block ${drag === b.id ? 'dragging' : ''}`} draggable onDragStart={() => setDrag(b.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(b.id)} onDragEnd={() => setDrag(null)}>
            <span className="blk-handle">⋮⋮</span>
            <select className="select" value={b.type} onChange={(e) => upd(b.id, { type: e.target.value as HomeBlock['type'], sourceId: '' })}>{BLOCK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
            <input className="input" placeholder="Titolo (vuoto = automatico)" value={b.title} onChange={(e) => upd(b.id, { title: e.target.value })} />
            {sourceOptions(b.type).length > 0 && <select className="select" value={b.sourceId} onChange={(e) => upd(b.id, { sourceId: e.target.value })}><option value="">— fonte —</option>{sourceOptions(b.type).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
            {!['newsletter', 'html'].includes(b.type) && <select className="select" value={b.layout} onChange={(e) => upd(b.id, { layout: e.target.value as HomeBlock['layout'] })}>{LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>}
            {!['newsletter', 'html'].includes(b.type) && <input className="input" type="number" min={1} max={12} style={{ width: 70 }} value={b.count} onChange={(e) => upd(b.id, { count: Number(e.target.value) })} />}
            {b.type === 'html' && <textarea className="textarea" style={{ minHeight: 50, fontFamily: 'monospace', fontSize: 12 }} placeholder="<div>…</div>" value={b.html ?? ''} onChange={(e) => upd(b.id, { html: e.target.value })} />}
            <button className="icon-btn danger" onClick={() => setBlocks(blocks.filter((x) => x.id !== b.id))}>✕</button>
          </div>)}
          <button className="btn btn-outline btn-sm" onClick={() => setBlocks([...blocks, { id: uid('hb'), type: 'category', title: '', sourceId: '', layout: 'grid4', count: 4 }])}>+ Aggiungi blocco</button>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Libreria di layout</div>
            {LAYOUT_PRESETS.map((p) => <div key={p.id} className="preset-row"><div><b>{p.name}</b><div className="help">{p.description}</div></div><button className="btn btn-outline btn-sm" disabled={pending} onClick={() => { if (!confirm(`Applicare «${p.name}»? Sostituisce i blocchi della home e le opzioni di layout del tema.`)) return; start(async () => { const r = await applyLayoutPresetAction(p.id); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); location.reload(); }); }}>Applica</button></div>)}
          </div>
          <div className="panel"><div className="panel-title">Esporta / importa (marketplace di layout)</div>
            <p className="help">Il JSON contiene tema e blocchi: condividilo con un&apos;altra installazione ASTER News o incolla qui un layout ricevuto.</p>
            <textarea className="textarea" style={{ minHeight: 80, fontFamily: 'monospace', fontSize: 11 }} readOnly value={exportJson} onClick={(e) => (e.target as HTMLTextAreaElement).select()} />
            <textarea className="textarea" style={{ minHeight: 60, fontFamily: 'monospace', fontSize: 11, marginTop: 8 }} placeholder="Incolla un layout JSON o un URL che lo restituisce" value={imp} onChange={(e) => setImp(e.target.value)} />
            <button className="btn btn-outline btn-sm" disabled={pending || !imp.trim()} onClick={() => start(async () => { const r = await importLayoutAction(imp); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setImp(''); router.refresh(); location.reload(); } })}>Importa</button>
          </div>
        </div>
      </div>
    </>
  );
}
