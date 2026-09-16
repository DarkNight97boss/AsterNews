'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { ensureTagAction, deleteArticleAction, saveArticleAction } from '@/lib/actions';
import { Article, ArticleFormat, ArticleStatus, Category, FORMAT_LABELS, LiveUpdate, MediaItem, STATUS_LABELS, Tag, User, Zone } from '@/lib/models';
import { Permission } from '@/lib/permissions';
import { formatDate, readingTime, slugify, stripHtml, toLocalInput, uid } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';
import { statusBadgeClass } from './badges';
import { MediaPicker } from './media-picker';
import { RichEditor } from './rich-editor';
import { SeoAssistant } from './seo-assistant';
import { EditorExtras } from './editor-extras';
import { BlockEditor } from './block-editor';
import { AiAssistant } from './ai-assistant';
import { TemplatePicker } from './template-picker';
import { TranscribePanel } from './transcribe-panel';
import { customFieldsAction } from '@/lib/actions-pages';
import type { CustomField } from '@/lib/models';
import { checkAccessibility } from '@/lib/a11y-check';
import { useEffect } from 'react';
import type { SeoContext } from '@/lib/seo-engine';

interface Props { initial: Article; isNew: boolean; isPublic: boolean; categories: Category[]; zones: Zone[]; tags: Tag[]; users: User[]; media: MediaItem[]; permissions: Permission[]; seoCtx: SeoContext; siteUrl: string; maxLinks: number; meId: string }
const FORMATS: ArticleFormat[] = ['standard', 'video', 'gallery', 'live'];

function shortTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function ArticleEditor({ initial, isNew, isPublic, categories, zones, tags: allTags, users, media, permissions, seoCtx, siteUrl, maxLinks, meId }: Props) {
  const router = useRouter();
  const [a, setA] = useState<Article>(initial);
  const [tags, setTags] = useState<Tag[]>(allTags);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<'cover' | 'gallery' | 'inline' | null>(null);
  const inlineCb = useState<{ cb: ((url: string, alt: string) => void) | null }>({ cb: null })[0];
  const [tagInput, setTagInput] = useState(''); const [luTitle, setLuTitle] = useState(''); const [luBody, setLuBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState(toLocalInput(initial.scheduledAt));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [editorMode, setEditorMode] = useState<'blocks' | 'classic'>('classic');
  const [focus, setFocus] = useState(false); const [fieldDefs, setFieldDefs] = useState<Record<string, CustomField[]>>({}); const [corrText, setCorrText] = useState('');
  useEffect(() => { customFieldsAction().then(setFieldDefs).catch(() => {}); }, []);
  const extra = a.extra ?? {}; const setExtra = (patch: Partial<NonNullable<Article['extra']>>) => set('extra', { ...extra, ...patch });
  const catFields = fieldDefs[a.categoryId] ?? [];
  useEffect(() => { try { const m = localStorage.getItem('editor_mode'); if (m === 'blocks' || m === 'classic') setEditorMode(m); } catch { /* ignore */ } }, []);
  const switchMode = (m: 'blocks' | 'classic') => { setEditorMode(m); try { localStorage.setItem('editor_mode', m); } catch { /* ignore */ } };
  const [pending, start] = useTransition();
  const can = (p: Permission) => permissions.includes(p);
  const set = <K extends keyof Article>(k: K, v: Article[K]) => { setA((x) => ({ ...x, [k]: v })); setDirty(true); };
  const setSeo = (k: keyof Article['seo'], v: string | boolean) => { setA((x) => ({ ...x, seo: { ...x.seo, [k]: v } })); setDirty(true); };
  const cat = categories.find((c) => c.id === a.categoryId);
  const words = useMemo(() => stripHtml(a.content).split(' ').filter(Boolean).length, [a.content]);
  const tagOf = (id: string) => tags.find((t) => t.id === id);
  const suggestions = tagInput.trim() ? tags.filter((t) => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !a.tagIds.includes(t.id)).slice(0, 6) : [];
  const allowed: ArticleStatus[] = can('article.publish') ? ['draft', 'review', 'scheduled', 'published', 'archived'] : ['draft', 'review'];

  const save = (status: ArticleStatus) => start(async () => {
    const payload: Article = { ...a, scheduledAt: status === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : a.scheduledAt };
    if (status === 'scheduled' && !scheduledAt) { toast.error('Imposta data e ora di programmazione.'); return; }
    const r = await saveArticleAction(payload, status);
    if (!r.ok) { toast.error(r.message ?? 'Errore'); return; }
    toast.success(r.message ?? 'Salvato.');
    setDirty(false);
    if (isNew && r.id) router.replace(`/admin/articoli/${r.id}`); else router.refresh();
  });
  const addTag = async (name: string) => { const t = await ensureTagAction(name); if (!t) return; if (!tags.some((x) => x.id === t.id)) setTags((l) => [...l, t]); if (!a.tagIds.includes(t.id)) set('tagIds', [...a.tagIds, t.id]); setTagInput(''); };
  const setVideo = (url: string) => { const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); set('videoUrl', m ? `https://www.youtube.com/embed/${m[1]}` : url); };
  const onPicked = (m: MediaItem) => { if (picker === 'cover') set('coverImage', m.url); else if (picker === 'inline') inlineCb.cb?.(m.url, m.alt); else set('gallery', [...a.gallery, m.url]); setPicker(null); router.refresh(); };
  const seoTitle = a.seo.title || a.title; const seoDesc = a.seo.description || a.excerpt || a.subtitle;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{isNew ? 'Nuovo articolo' : 'Modifica articolo'}</h1>
          <p><span className={statusBadgeClass(a.status)}>{STATUS_LABELS[a.status]}</span> · {words} parole · {readingTime(a.content)} min di lettura {dirty && <>· <b style={{ color: 'var(--amber)' }}>modifiche non salvate</b></>}</p>
        </div>
        <div className="actions">
          <Link href="/admin/articoli" className="btn btn-ghost">← Articoli</Link>
          {isPublic && <Link className="btn btn-outline" href={`/${cat?.slug}/${a.slug}`} target="_blank">Vedi sul sito ↗</Link>}
          <button className="btn btn-outline" disabled={pending} onClick={() => save('draft')}>Salva bozza</button>
          {!can('article.publish') && <button className="btn btn-dark" disabled={pending} onClick={() => save('review')}>Invia in revisione</button>}
          {can('article.publish') && (a.status === 'scheduled' || scheduledAt) && <button className="btn btn-dark" disabled={pending} onClick={() => save('scheduled')}>Programma</button>}
          {can('article.publish') && <button className="btn btn-primary" disabled={pending} onClick={() => save('published')}>{a.status === 'published' ? 'Aggiorna' : 'Pubblica'}</button>}
        </div>
      </div>

      <div className="editor-tools"><button type="button" className={`btn btn-sm ${focus ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFocus(!focus)} title="Schermo pulito, solo testo">{focus ? '✕ Esci da Focus' : '◎ Modalità Focus'}</button><span className="help">{words} parole{extra.wordsTarget ? ` / obiettivo ${extra.wordsTarget}` : ''} · {Math.max(1, Math.round(words / 200))} min di lettura</span>{focus && <input className="input" style={{ width: 120 }} type="number" placeholder="Obiettivo parole" value={extra.wordsTarget ?? ''} onChange={(e) => setExtra({ wordsTarget: Number(e.target.value) || undefined })} />}</div>
      {isNew && !a.content && !a.title && <TemplatePicker onPick={(t) => { setA((x) => ({ ...x, kicker: t.kicker, format: t.format, content: t.content, extra: { ...(x.extra ?? {}), template: t.id, fields: { ...(x.extra?.fields ?? {}), ...(t.fields ?? {}) } } })); setDirty(true); setEditorMode('blocks'); }} />}
      <div className={`editor-grid ${focus ? 'focus-mode' : ''}`}>
        <div>
          <div className="panel">
            <input className="input" style={{ textTransform: 'uppercase', fontWeight: 800, fontSize: 13, letterSpacing: '.08em', color: 'var(--red)', border: 0, paddingLeft: 0 }} placeholder="OCCHIELLO (es. MALTEMPO)" value={a.kicker} onChange={(e) => set('kicker', e.target.value)} />
            <textarea className="title-input" rows={2} style={{ resize: 'none', lineHeight: 1.2 }} placeholder="Titolo dell'articolo" value={a.title} onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} />
            <textarea className="subtitle-input" rows={2} placeholder="Sommario / sottotitolo" value={a.subtitle} onChange={(e) => set('subtitle', e.target.value)} />
            <div className="editor-mode"><span className="help">Editor:</span><button type="button" className={editorMode === 'blocks' ? 'on' : ''} onClick={() => switchMode('blocks')}>Blocchi</button><button type="button" className={editorMode === 'classic' ? 'on' : ''} onClick={() => switchMode('classic')}>Classico</button></div>
            <div style={{ marginTop: 10 }}>{editorMode === 'blocks' ? <BlockEditor value={a.content} articleId={a.id} onChange={(v) => set('content', v)} onPickImage={(cb) => { inlineCb.cb = cb; setPicker('inline'); }} /> : <RichEditor value={a.content} articleId={a.id} onChange={(v) => set('content', v)} onPickImage={(cb) => { inlineCb.cb = cb; setPicker('inline'); }} />}</div>
          </div>

          <div className="panel">
            <div className="panel-title">Anteprima e riassunto</div>
            <div className="field"><label>Estratto (mostrato nelle card e nei social)</label>
              <textarea className="textarea" value={a.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="Lascia vuoto per generarlo dal sottotitolo" />
              <div className={`char-count ${a.excerpt.length > 200 ? 'over' : ''}`}>{a.excerpt.length}/200</div></div>
          </div>

          <AiAssistant article={a} categories={categories.map((c) => ({ id: c.id, name: c.name }))} onPatch={(p) => { setA((x) => ({ ...x, ...p })); setDirty(true); }} onAddTag={(name) => addTag(name)} />

          <EditorExtras article={a} isNew={isNew} users={users} canAssign={can('article.assign')} canPublish={can('article.publish')} meId={meId} dirty={dirty} onRestoreDraft={(d) => { setA({ ...d, id: a.id }); setDirty(true); }} onPatch={(p) => setA((x) => ({ ...x, ...p }))} />

          {catFields.length > 0 && <div className="panel"><div className="panel-title">Scheda ({categories.find((c) => c.id === a.categoryId)?.name})</div>{catFields.map((f) => <div className="field" key={f.key}><label>{f.label}</label>{f.type === 'rating' ? <select className="select" value={extra.fields?.[f.key] ?? ''} onChange={(e) => setExtra({ fields: { ...(extra.fields ?? {}), [f.key]: e.target.value } })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}</select> : f.type === 'select' ? <select className="select" value={extra.fields?.[f.key] ?? ''} onChange={(e) => setExtra({ fields: { ...(extra.fields ?? {}), [f.key]: e.target.value } })}><option value="">—</option>{(f.options ?? '').split(',').map((o) => o.trim()).filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}</select> : <input className="input" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'} value={extra.fields?.[f.key] ?? ''} onChange={(e) => setExtra({ fields: { ...(extra.fields ?? {}), [f.key]: e.target.value } })} />}</div>)}</div>}
          <div className="panel"><div className="panel-title">Correzioni e cronologia</div>
            <label className="switch" style={{ marginBottom: 8 }}><input type="checkbox" checked={!!extra.showHistory} onChange={(e) => setExtra({ showHistory: e.target.checked })} /> Mostra ai lettori la cronologia degli aggiornamenti</label>
            {(extra.corrections ?? []).map((c, i) => <div key={i} className="corr-item"><span className="help">{formatDate(c.date)}</span> {c.text} <button type="button" className="icon-btn danger" onClick={() => setExtra({ corrections: (extra.corrections ?? []).filter((_, j) => j !== i) })}>✕</button></div>)}
            <div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="Testo della correzione (Corrige)" value={corrText} onChange={(e) => setCorrText(e.target.value)} /><button type="button" className="btn btn-outline btn-sm" disabled={!corrText.trim()} onClick={() => { setExtra({ corrections: [...(extra.corrections ?? []), { date: new Date().toISOString(), text: corrText.trim() }] }); setCorrText(''); }}>Aggiungi</button></div>
            <p className="help" style={{ marginTop: 6 }}>Le correzioni compaiono datate in fondo all&apos;articolo e nei dati strutturati.</p>
          </div>
          <TranscribePanel onInsert={(html) => set('content', a.content + '\n' + html)} />
          <div className="panel"><div className="panel-title">Accessibilità</div>{(() => { const issues = checkAccessibility(a.content, a.title); return issues.length ? <ul className="ai-list">{issues.map((i, k) => <li key={k}><span className={`badge ${i.level === 'error' ? 'badge-red' : 'badge-gray'}`}>{i.level === 'error' ? 'da correggere' : 'consiglio'}</span> {i.text}</li>)}</ul> : <p className="help">Nessun problema di accessibilità rilevato nel testo.</p>; })()}</div>

          <div className="panel"><div className="panel-title">Domande e risposte (FAQ) <button className="btn btn-outline btn-sm" onClick={() => set('faq', [...(a.faq ?? []), { q: '', a: '' }])}>+ Aggiungi</button></div>
            <p className="help">Compaiono in fondo all&apos;articolo e come dati strutturati FAQ per Google.</p>
            <div className="faq-list">{(a.faq ?? []).map((f, i) => <div key={i} className="faq-item"><input className="input" placeholder="Domanda" value={f.q} onChange={(e) => set('faq', (a.faq ?? []).map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} /><textarea className="textarea" style={{ minHeight: 50, marginTop: 6 }} placeholder="Risposta" value={f.a} onChange={(e) => set('faq', (a.faq ?? []).map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} /><button className="icon-btn danger" onClick={() => set('faq', (a.faq ?? []).filter((_, j) => j !== i))}>Rimuovi</button></div>)}</div>
          </div>

          {a.format === 'video' && (
            <div className="panel"><div className="panel-title">Video</div>
              <div className="field"><label>URL YouTube (embed o link)</label><input className="input" value={a.videoUrl} onChange={(e) => setVideo(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></div>
              {a.videoUrl && <div className="help">Embed: {a.videoUrl}</div>}
            </div>
          )}
          {a.format === 'gallery' && (
            <div className="panel"><div className="panel-title">Fotogallery <button className="btn btn-outline btn-sm" onClick={() => setPicker('gallery')}>+ Aggiungi foto</button></div>
              <div className="media-grid">
                {a.gallery.map((g, i) => (
                  <div key={i} className="media-item"><div className="m-img"><img src={g} alt="" /></div><div className="m-name" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Foto {i + 1}</span><button className="icon-btn danger" style={{ padding: 0 }} onClick={() => set('gallery', a.gallery.filter((_, x) => x !== i))}>✕</button></div></div>
                ))}
                {a.gallery.length === 0 && <p className="help">Nessuna foto. Aggiungi immagini dalla libreria.</p>}
              </div>
            </div>
          )}
          {a.format === 'live' && (
            <div className="panel">
              <div className="panel-title">Diretta <label className="switch"><input type="checkbox" checked={a.liveActive} onChange={(e) => set('liveActive', e.target.checked)} /> Diretta attiva</label></div>
              <div className="field"><label>Titolo aggiornamento</label><input className="input" value={luTitle} onChange={(e) => setLuTitle(e.target.value)} placeholder="es. Riaperta la metro A" /></div>
              <div className="field"><label>Testo</label><textarea className="textarea" style={{ minHeight: 70 }} value={luBody} onChange={(e) => setLuBody(e.target.value)} /></div>
              <button className="btn btn-dark btn-sm" disabled={!luTitle.trim()} onClick={() => { const u: LiveUpdate = { id: uid('lu'), time: new Date().toISOString(), title: luTitle.trim(), body: luBody.trim() }; set('liveUpdates', [u, ...a.liveUpdates]); setLuTitle(''); setLuBody(''); }}>+ Aggiungi aggiornamento</button>
              <div className="live-feed" style={{ marginTop: 16, borderColor: 'var(--gray-300)' }}>
                {[...a.liveUpdates].sort((x, y) => y.time.localeCompare(x.time)).map((u) => (
                  <div key={u.id} className="live-item"><time>{shortTime(u.time)}</time><div><h4>{u.title}</h4><p>{u.body}</p><button className="icon-btn danger" style={{ padding: '2px 6px', fontSize: 12 }} onClick={() => set('liveUpdates', a.liveUpdates.filter((x) => x.id !== u.id))}>Elimina</button></div></div>
                ))}
                {a.liveUpdates.length === 0 && <p className="help" style={{ padding: 12 }}>Nessun aggiornamento.</p>}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-title">SEO automatica</div>
            <SeoAssistant article={a} ctx={{ ...seoCtx, tags }} siteUrl={siteUrl} maxLinks={maxLinks} onPatch={(patch) => { setA((x) => ({ ...x, ...patch })); setDirty(true); if (patch.slug) setSlugTouched(true); }} onAddTag={(name) => addTag(name)} />
            <div className="panel-title" style={{ marginTop: 20 }}>Anteprima Google</div>
            <div className="seo-preview">
              <div className="s-url">asternews.it › {cat?.slug} › {a.slug || slugify(a.title)}</div>
              <div className="s-title">{seoTitle || 'Titolo articolo'}</div>
              <div className="s-desc">{seoDesc || 'Descrizione...'}</div>
            </div>
            <div className="form-row" style={{ marginTop: 16 }}>
              <div className="field"><label>Meta title</label><input className="input" value={a.seo.title} onChange={(e) => setSeo('title', e.target.value)} placeholder={a.title} /><div className={`char-count ${seoTitle.length > 60 ? 'over' : ''}`}>{seoTitle.length}/60</div></div>
              <div className="field"><label>Slug URL</label><input className="input" value={a.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} /></div>
            </div>
            <div className="field"><label>Meta description</label><textarea className="textarea" style={{ minHeight: 60 }} value={a.seo.description} onChange={(e) => setSeo('description', e.target.value)} /><div className={`char-count ${seoDesc.length > 160 ? 'over' : ''}`}>{seoDesc.length}/160</div></div>
            <div className="form-row">
              <div className="field"><label>Canonical URL</label><input className="input" value={a.seo.canonical} onChange={(e) => setSeo('canonical', e.target.value)} placeholder="https://..." /></div>
              <div className="field"><label>&nbsp;</label><label className="checkbox"><input type="checkbox" checked={a.seo.noIndex} onChange={(e) => setSeo('noIndex', e.target.checked)} /> Nascondi ai motori di ricerca (noindex)</label></div>
            </div>
          </div>
        </div>

        <aside className="editor-side">
          <div className="panel">
            <div className="panel-title">Pubblicazione</div>
            <div className="field"><label>Stato</label><select className="select" value={a.status} onChange={(e) => set('status', e.target.value as ArticleStatus)}>{allowed.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></div>
            {can('article.publish') && <div className="field"><label>Programma pubblicazione</label><input className="input" type="datetime-local" value={scheduledAt} onChange={(e) => { setScheduledAt(e.target.value); setDirty(true); }} /><div className="help">Imposta data e ora futura, poi premi &quot;Programma&quot;.</div></div>}
            {a.publishedAt && <div className="field"><label>Pubblicato il</label><input className="input" type="datetime-local" value={toLocalInput(a.publishedAt)} onChange={(e) => set('publishedAt', e.target.value ? new Date(e.target.value).toISOString() : null)} /></div>}
            <div className="field"><label>Firma personalizzata (pseudonimo o «La redazione»)</label><input className="input" value={a.byline ?? ''} onChange={(e) => set('byline', e.target.value)} placeholder="vuoto = nome dell'autore" /></div>
            <div className="field"><label>Coautori</label><div className="chips">{users.filter((u) => u.id !== a.authorId).map((u) => { const on = (a.coauthorIds ?? []).includes(u.id); return <button key={u.id} type="button" className="chip" style={on ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => set('coauthorIds', on ? (a.coauthorIds ?? []).filter((x) => x !== u.id) : [...(a.coauthorIds ?? []), u.id])}>{u.name}</button>; })}</div></div>
            <div className="field"><label>Autore</label><select className="select" value={a.authorId} disabled={!can('article.edit.any')} onChange={(e) => set('authorId', e.target.value)}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="field"><label>Formato</label><select className="select" value={a.format} onChange={(e) => set('format', e.target.value as ArticleFormat)}>{FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}</select></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <label className="switch"><input type="checkbox" checked={a.featured} onChange={(e) => set('featured', e.target.checked)} /> In evidenza (hero homepage)</label>
              <label className="switch"><input type="checkbox" checked={a.breaking} onChange={(e) => set('breaking', e.target.checked)} /> Ultim&apos;ora (ticker)</label>
              <label className="switch"><input type="checkbox" checked={a.sponsored} onChange={(e) => set('sponsored', e.target.checked)} /> Contenuto sponsorizzato</label>
              <label className="switch"><input type="checkbox" checked={a.allowComments} onChange={(e) => set('allowComments', e.target.checked)} /> Consenti commenti</label>
              <label className="switch"><input type="checkbox" checked={!!a.premium} onChange={(e) => set('premium', e.target.checked)} /> Riservato agli abbonati (premium)</label>
            </div>
            <div className="field" style={{ marginTop: 12, marginBottom: 0 }}><label>Testo per i social (vuoto = automatico)</label><textarea className="textarea" style={{ minHeight: 56 }} value={a.socialText ?? ''} onChange={(e) => set('socialText', e.target.value)} placeholder="Usato da Facebook, X e Telegram alla pubblicazione" /></div>
            <div style={{ display: 'none' }}>
            </div>
          </div>
          <div className="panel"><div className="panel-title">Categoria</div>
            <select className="select" value={a.categoryId} onChange={(e) => set('categoryId', e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </div>
          <div className="panel"><div className="panel-title">Zona e luogo</div>
            <div className="field"><label>Zona / comune</label><select className="select" value={a.zoneId} onChange={(e) => set('zoneId', e.target.value)}><option value="">Nessuna</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Indirizzo</label><input className="input" value={a.address} onChange={(e) => set('address', e.target.value)} placeholder="es. Via Tuscia, 43" /></div>
          </div>
          <div className="panel"><div className="panel-title">Tag</div>
            <div className="chips" style={{ marginBottom: 8 }}>{a.tagIds.map((id) => <span key={id} className="chip">{tagOf(id)?.name}<button onClick={() => set('tagIds', a.tagIds.filter((t) => t !== id))}>✕</button></span>)}</div>
            <input className="input" placeholder="Aggiungi tag e premi Invio" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput.trim()) addTag(tagInput.trim()); } }} />
            {suggestions.length > 0 && <div className="suggest">{suggestions.map((t) => <button key={t.id} onClick={() => addTag(t.name)}>{t.name}</button>)}</div>}
          </div>
          <div className="panel cover-picker"><div className="panel-title">Immagine di copertina</div>
            <div className="cover-preview">{a.coverImage ? <img src={a.coverImage} alt="" /> : 'Nessuna immagine'}</div>
            <div className="cover-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setPicker('cover')}>Scegli dalla libreria</button>
              {a.coverImage && <button className="btn btn-ghost btn-sm" onClick={() => set('coverImage', '')}>Rimuovi</button>}
            </div>
            <div className="field" style={{ marginTop: 12 }}><label>Didascalia / credit</label><input className="input" value={a.coverCaption} onChange={(e) => set('coverCaption', e.target.value)} /></div>
          </div>
          {!isNew && (
            <div className="panel"><div className="panel-title">Info</div>
              <div className="help">Creato: {formatDate(a.createdAt)}<br />Aggiornato: {formatDate(a.updatedAt)}<br />Visualizzazioni: {a.views}</div>
              {can('article.delete') && <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }} onClick={() => { if (confirm('Eliminare definitivamente questo articolo?')) start(async () => { await deleteArticleAction(a.id); router.push('/admin/articoli'); }); }}>Elimina articolo</button>}
            </div>
          )}
        </aside>
      </div>
      {picker && <MediaPicker media={media} onPick={onPicked} onClose={() => setPicker(null)} />}
    </>
  );
}
