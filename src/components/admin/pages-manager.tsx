'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deletePageAction, savePageAction } from '@/lib/actions-pages';
import type { MediaItem, Page } from '@/lib/models';
import { formatDate, slugify } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { BlockEditor } from './block-editor';
import { MediaPicker } from './media-picker';

const blank = (authorId: string): Page => ({ id: '', slug: '', title: '', content: '', excerpt: '', status: 'draft', template: 'standard', coverImage: '', seo: { title: '', description: '', canonical: '', noIndex: false }, showInMenu: false, menuOrder: 0, authorId, createdAt: '', updatedAt: '' });

/** Pagine statiche (Chi siamo, Contatti, Privacy…): editor a blocchi, modello, SEO e presenza nel menu. */
export function PagesManager({ pages, meId, media }: { pages: Page[]; meId: string; media: MediaItem[] }) {
  const router = useRouter(); const [p, setP] = useState<Page | null>(null); const [pending, start] = useTransition();
  const [picker, setPicker] = useState<null | 'cover' | 'inline'>(null); const [inlineCb] = useState<{ cb: ((url: string, alt: string) => void) | null }>({ cb: null });
  const set = <K extends keyof Page>(k: K, v: Page[K]) => setP((x) => (x ? { ...x, [k]: v } : x));
  const save = (status?: Page['status']) => start(async () => { if (!p) return; const r = await savePageAction({ ...p, status: status ?? p.status }); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setP(null); router.refresh(); } });
  if (p) return (
    <>
      <div className="page-title"><div><h1>{p.id ? 'Modifica pagina' : 'Nuova pagina'}</h1><p>Le pagine sono raggiungibili su <code>/{p.slug || 'slug'}</code>.</p></div><div className="actions"><button className="btn btn-ghost" onClick={() => setP(null)}>Annulla</button><button className="btn btn-outline" disabled={pending} onClick={() => save('draft')}>Salva bozza</button><button className="btn btn-primary" disabled={pending} onClick={() => save('published')}>Pubblica</button></div></div>
      <div className="editor-grid">
        <div>
          <input className="input title-input" placeholder="Titolo della pagina" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value, slug: p.id ? p.slug : slugify(e.target.value) })} />
          <div className="field" style={{ marginTop: 10 }}><label>Sommario (facoltativo)</label><textarea className="textarea" style={{ minHeight: 56 }} value={p.excerpt} onChange={(e) => set('excerpt', e.target.value)} /></div>
          <div style={{ marginTop: 10 }}><BlockEditor value={p.content} articleId={p.id || 'page'} onChange={(v) => set('content', v)} onPickImage={(cb) => { inlineCb.cb = cb; setPicker('inline'); }} /></div>
        </div>
        <aside className="editor-side">
          <div className="panel"><div className="panel-title">Pubblicazione</div>
            <div className="field"><label>Slug</label><input className="input" value={p.slug} onChange={(e) => set('slug', e.target.value)} /></div>
            <div className="field"><label>Modello</label><select className="select" value={p.template} onChange={(e) => set('template', e.target.value as Page['template'])}><option value="standard">Standard (con colonna)</option><option value="wide">Largo (senza colonna)</option><option value="landing">Landing (senza testata piena)</option></select></div>
            <label className="switch"><input type="checkbox" checked={p.showInMenu} onChange={(e) => set('showInMenu', e.target.checked)} /> Mostra nel menu del sito</label>
            <div className="field" style={{ marginTop: 8 }}><label>Ordine nel menu</label><input className="input" type="number" value={p.menuOrder} onChange={(e) => set('menuOrder', Number(e.target.value))} /></div>
          </div>
          <div className="panel"><div className="panel-title">Immagine di testa</div>
            {p.coverImage && <img src={p.coverImage} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 8 }} />}
            <div style={{ display: 'flex', gap: 6 }}><button className="btn btn-outline btn-sm" onClick={() => setPicker('cover')}>Scegli</button>{p.coverImage && <button className="btn btn-ghost btn-sm" onClick={() => set('coverImage', '')}>Rimuovi</button>}</div>
          </div>
          {p.template === 'landing' && <div className="panel"><div className="panel-title">Landing / microsito</div>
            <div className="form-row"><div className="field"><label>Colore del microsito</label><input className="input" type="color" value={p.extra?.brand || '#22418f'} onChange={(e) => set('extra', { ...(p.extra ?? {}), brand: e.target.value })} /></div><div className="field"><label>Conto alla rovescia (data)</label><input className="input" type="datetime-local" value={p.extra?.countdownAt ?? ''} onChange={(e) => set('extra', { ...(p.extra ?? {}), countdownAt: e.target.value })} /></div></div>
            <div className="field"><label>Etichetta del conto alla rovescia</label><input className="input" value={p.extra?.countdownLabel ?? ''} onChange={(e) => set('extra', { ...(p.extra ?? {}), countdownLabel: e.target.value })} placeholder="Alla chiusura dei seggi" /></div>
            <div className="form-row"><div className="field"><label>Feed articoli dal tag (id o slug)</label><input className="input" value={p.extra?.feedTagId ?? ''} onChange={(e) => set('extra', { ...(p.extra ?? {}), feedTagId: e.target.value })} placeholder="elezioni-2026" /></div><div className="field"><label>Quanti</label><input className="input" type="number" value={p.extra?.feedCount ?? 6} onChange={(e) => set('extra', { ...(p.extra ?? {}), feedCount: Number(e.target.value) })} /></div></div>
            <div className="form-row"><div className="field"><label>Pulsante (testo)</label><input className="input" value={p.extra?.ctaLabel ?? ''} onChange={(e) => set('extra', { ...(p.extra ?? {}), ctaLabel: e.target.value })} /></div><div className="field"><label>Pulsante (link)</label><input className="input" value={p.extra?.ctaUrl ?? ''} onChange={(e) => set('extra', { ...(p.extra ?? {}), ctaUrl: e.target.value })} /></div></div>
          </div>}
          <div className="panel"><div className="panel-title">SEO</div>
            <div className="field"><label>Titolo SEO</label><input className="input" value={p.seo.title} onChange={(e) => set('seo', { ...p.seo, title: e.target.value })} /></div>
            <div className="field"><label>Descrizione</label><textarea className="textarea" style={{ minHeight: 56 }} value={p.seo.description} onChange={(e) => set('seo', { ...p.seo, description: e.target.value })} /></div>
            <label className="switch"><input type="checkbox" checked={p.seo.noIndex} onChange={(e) => set('seo', { ...p.seo, noIndex: e.target.checked })} /> Nascondi ai motori di ricerca</label>
          </div>
        </aside>
      </div>
      {picker && <MediaPicker media={media} onClose={() => setPicker(null)} onPick={(m) => { if (picker === 'cover') set('coverImage', m.url); else inlineCb.cb?.(m.url, m.alt); setPicker(null); }} />}
    </>
  );
  return (
    <>
      <div className="page-title"><div><h1>Pagine</h1><p>Chi siamo, contatti, privacy, redazione: contenuti fissi fuori dal flusso delle notizie.</p></div><div className="actions"><Link href="/admin/menu" className="btn btn-outline">Menu del sito</Link><button className="btn btn-primary" onClick={() => setP(blank(meId))}>+ Nuova pagina</button></div></div>
      <div className="table-wrap"><table className="table"><thead><tr><th>Titolo</th><th>Indirizzo</th><th>Stato</th><th>Menu</th><th>Aggiornata</th><th></th></tr></thead><tbody>
        {pages.map((x) => <tr key={x.id}><td className="t-title"><a href="#" onClick={(e) => { e.preventDefault(); setP({ ...x }); }}>{x.title}</a></td><td><code>/{x.slug}</code></td><td>{x.status === 'published' ? <span className="badge badge-green">pubblicata</span> : <span className="badge badge-gray">bozza</span>}</td><td>{x.showInMenu ? '✔' : '—'}</td><td className="help">{formatDate(x.updatedAt)}</td><td><div className="t-actions">{x.status === 'published' && <Link className="icon-btn" href={`/${x.slug}`} target="_blank" title="Apri">↗</Link>}<button className="icon-btn" onClick={() => setP({ ...x })}>✎</button><ActionButton className="icon-btn danger" confirm={`Eliminare «${x.title}»?`} action={() => deletePageAction(x.id)}>🗑</ActionButton></div></td></tr>)}
        {pages.length === 0 && <tr><td colSpan={6} className="help">Nessuna pagina. Crea «Chi siamo», «Contatti» o «Privacy».</td></tr>}
      </tbody></table></div>
    </>
  );
}
