'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPollAction } from '@/lib/actions-editorial';
import { listSnippetsAction } from '@/lib/actions-pages';
import { circlesAction } from '@/lib/actions-circles';
import { cleanPastedHtml, hasBlockElements } from '@/lib/paste-clean';
import { chartSvg, csvToTable, parseChartData } from '@/lib/chart-svg';
import { toast } from '@/components/ui/toaster';

/**
 * Editor a blocchi: il contenuto resta HTML (compatibile con SEO, importazione e sito), ma viene diviso in blocchi
 * di primo livello riordinabili con trascinamento, ognuno modificabile nel suo tipo. Il classico contentEditable
 * è disponibile come alternativa ("Classico") nello stesso editor.
 */
type BlockType = 'paragraph' | 'heading2' | 'heading3' | 'quote' | 'list' | 'image' | 'embed' | 'table' | 'box' | 'poll' | 'readalso' | 'divider' | 'html' | 'timeline' | 'beforeafter' | 'chart' | 'snippet' | 'quiz' | 'layered' | 'circle';
interface Block { id: string; type: BlockType; html: string }
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);
const LABEL: Record<BlockType, string> = { layered: 'Paragrafo a strati', circle: 'Solo per una cerchia', quiz: 'Quiz', timeline: 'Timeline', beforeafter: 'Prima / dopo', chart: 'Grafico', snippet: 'Blocco riutilizzabile', paragraph: 'Paragrafo', heading2: 'Titolo H2', heading3: 'Titolo H3', quote: 'Citazione', list: 'Elenco', image: 'Immagine', embed: 'Embed / video', table: 'Tabella', box: 'Riquadro', poll: 'Sondaggio', readalso: 'Leggi anche', divider: 'Separatore', html: 'HTML' };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function typeOf(el: Element): BlockType {
  const t = el.tagName.toLowerCase();
  if (t === 'p') return 'paragraph'; if (t === 'h2' || t === 'h1') return 'heading2'; if (t === 'h3' || t === 'h4') return 'heading3';
  if (t === 'blockquote') return el.classList.contains('twitter-tweet') || el.classList.contains('instagram-media') || el.classList.contains('tiktok-embed') ? 'embed' : 'quote';
  if (t === 'ul' || t === 'ol') return 'list'; if (t === 'figure' || t === 'img') return 'image'; if (t === 'table') return 'table'; if (t === 'hr') return 'divider';
  if (t === 'iframe' || el.classList.contains('embed-video') || el.classList.contains('embed-map') || el.classList.contains('inline-gallery')) return 'embed';
  if (el.classList.contains('timeline')) return 'timeline'; if (el.classList.contains('before-after')) return 'beforeafter'; if (el.classList.contains('chart-block')) return 'chart'; if (el.hasAttribute('data-snippet')) return 'snippet'; if (el.hasAttribute('data-quiz')) return 'quiz'; if (el.classList.contains('layered')) return 'layered'; if (el.classList.contains('circle-only')) return 'circle'; if (el.classList.contains('know-box')) return 'box'; if (el.classList.contains('embed-pdf') || el.classList.contains('audio-embed')) return 'embed';
  if (el.hasAttribute('data-poll')) return 'poll'; if (el.classList.contains('read-also')) return 'readalso'; if (el.classList.contains('box') || el.classList.contains('pull-quote')) return 'box';
  return 'html';
}
export function parseBlocks(html: string): Block[] {
  if (typeof window === 'undefined') return [];
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, 'text/html');
  const root = doc.getElementById('root')!; const out: Block[] = [];
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) { const t = node.textContent?.trim(); if (t) out.push({ id: uid(), type: 'paragraph', html: `<p>${escapeHtml(t)}</p>` }); continue; }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element; if (el.tagName.toLowerCase() === 'br') continue;
    out.push({ id: uid(), type: typeOf(el), html: el.outerHTML });
  }
  return out.length ? out : [{ id: uid(), type: 'paragraph', html: '<p></p>' }];
}
export const serializeBlocks = (blocks: Block[]): string => blocks.map((b) => b.html).join('\n');

/** Blocco di testo con formattazione inline (grassetto, corsivo, link) su un piccolo contentEditable. */
function TextBlock({ block, onChange, placeholder }: { block: Block; onChange: (html: string) => void; placeholder: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const tag = block.type === 'heading2' ? 'h2' : block.type === 'heading3' ? 'h3' : block.type === 'quote' ? 'blockquote' : block.type === 'list' ? 'div' : 'p';
  useEffect(() => { const el = ref.current; if (!el) return; const inner = block.html.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/, ''); if (el.innerHTML !== inner && document.activeElement !== el) el.innerHTML = block.type === 'list' ? block.html : inner; }, [block.html, block.type]);
  const emit = () => { const el = ref.current; if (!el) return; onChange(block.type === 'list' ? el.innerHTML : `<${tag}>${el.innerHTML}</${tag}>`); };
  const cmd = (c: string, arg?: string) => { document.execCommand(c, false, arg); emit(); };
  return (
    <div className="blk-text-wrap">
      <div className="blk-inline-tools"><button type="button" onMouseDown={(e) => { e.preventDefault(); cmd('bold'); }}><b>B</b></button><button type="button" onMouseDown={(e) => { e.preventDefault(); cmd('italic'); }}><i>I</i></button><button type="button" title="Nota a piè di pagina: [^testo]" onMouseDown={(e) => { e.preventDefault(); cmd('insertText', '[^testo della nota]'); }}>¹</button><button type="button" onMouseDown={(e) => { e.preventDefault(); const u = prompt('Link (https://...)'); if (u) cmd('createLink', u); }}>🔗</button><button type="button" onMouseDown={(e) => { e.preventDefault(); cmd('removeFormat'); }}>Tx</button></div>
      <div ref={ref} className={`blk-edit blk-${block.type}`} contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={emit} onBlur={emit} onPaste={(e) => { e.preventDefault(); const html = e.clipboardData.getData('text/html'); const text = e.clipboardData.getData('text/plain'); if (html) { const clean = cleanPastedHtml(html); if (hasBlockElements(clean)) { ref.current?.parentElement?.parentElement?.dispatchEvent(new CustomEvent('pasteblocks', { detail: clean, bubbles: true })); return; } document.execCommand('insertHTML', false, clean); } else document.execCommand('insertText', false, text); emit(); }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && block.type !== 'list' && block.type !== 'quote') { e.preventDefault(); (e.currentTarget.closest('.blk') as HTMLElement | null)?.dispatchEvent(new CustomEvent('newblock', { bubbles: true })); } }} />
    </div>
  );
}

export function BlockEditor({ value, onChange, articleId = '', onPickImage }: { value: string; onChange: (html: string) => void; articleId?: string; onPickImage?: (cb: (url: string, alt: string) => void) => void }) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseBlocks(value));
  const lastEmitted = useRef(value);
  const [drag, setDrag] = useState<string | null>(null);
  const [inserter, setInserter] = useState<number | null>(null);
  useEffect(() => { if (value !== lastEmitted.current) { setBlocks(parseBlocks(value)); lastEmitted.current = value; } }, [value]);
  const commit = useCallback((next: Block[]) => { setBlocks(next); const html = serializeBlocks(next); lastEmitted.current = html; onChange(html); }, [onChange]);
  const update = (id: string, html: string) => commit(blocks.map((b) => (b.id === id ? { ...b, html, type: b.type } : b)));
  const remove = (id: string) => commit(blocks.filter((b) => b.id !== id));
  const move = (id: string, dir: -1 | 1) => { const i = blocks.findIndex((b) => b.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= blocks.length) return; const n = [...blocks]; [n[i], n[j]] = [n[j], n[i]]; commit(n); };
  const insertAt = (index: number, b: Block) => { const n = [...blocks]; n.splice(index, 0, b); commit(n); setInserter(null); };
  const drop = (targetId: string) => { if (!drag || drag === targetId) return; const from = blocks.findIndex((b) => b.id === drag); const to = blocks.findIndex((b) => b.id === targetId); const n = [...blocks]; const [m] = n.splice(from, 1); n.splice(to, 0, m); commit(n); setDrag(null); };
  const changeType = (id: string, t: BlockType) => { const b = blocks.find((x) => x.id === id); if (!b) return; const inner = b.html.replace(/^<[^>]+>/, '').replace(/<\/[^>]+>$/, ''); const tag = t === 'heading2' ? 'h2' : t === 'heading3' ? 'h3' : t === 'quote' ? 'blockquote' : 'p'; commit(blocks.map((x) => (x.id === id ? { ...x, type: t, html: t === 'list' ? `<ul><li>${inner}</li></ul>` : `<${tag}>${inner}</${tag}>` } : x))); };
  const menu = useMemo(() => [
    { t: 'paragraph' as BlockType, label: '¶ Paragrafo', make: () => '<p></p>' }, { t: 'heading2' as BlockType, label: 'H2 Titolo', make: () => '<h2></h2>' }, { t: 'heading3' as BlockType, label: 'H3 Sottotitolo', make: () => '<h3></h3>' }, { t: 'quote' as BlockType, label: '❝ Citazione', make: () => '<blockquote></blockquote>' }, { t: 'list' as BlockType, label: '• Elenco', make: () => '<ul><li></li></ul>' },
    { t: 'image' as BlockType, label: '🖼 Immagine', make: () => null }, { t: 'embed' as BlockType, label: '▶ Video YouTube', make: () => { const u = prompt('URL YouTube'); if (!u) return null; const m = u.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return `<div class="embed-video"><iframe src="https://www.youtube.com/embed/${m ? m[1] : u}" allowfullscreen loading="lazy" title="Video"></iframe></div>`; } },
    { t: 'embed' as BlockType, label: '📷 Instagram', make: () => { const u = prompt('Link del post Instagram'); if (!u) return null; const c = u.split('?')[0].replace(/\/?$/, '/'); return `<blockquote class="instagram-media" data-instgrm-permalink="${c}" data-instgrm-version="14"><a href="${c}">Vedi il post su Instagram</a></blockquote>`; } },
    { t: 'embed' as BlockType, label: '𝕏 Post su X', make: () => { const u = prompt('Link del post su X'); return u ? `<blockquote class="twitter-tweet"><a href="${u.replace('x.com', 'twitter.com')}">Vedi il post su X</a></blockquote>` : null; } },
    { t: 'embed' as BlockType, label: '🗺 Mappa', make: () => { const q = prompt('Indirizzo o luogo'); return q ? `<div class="embed-map"><iframe src="https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed" loading="lazy" title="Mappa"></iframe></div>` : null; } },
    { t: 'table' as BlockType, label: '▦ Tabella', make: () => { const r = Number(prompt('Righe', '3')) || 3; const c = Number(prompt('Colonne', '3')) || 3; return `<table><thead><tr>${Array.from({ length: c }, (_, i) => `<th>Colonna ${i + 1}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: r - 1 }, () => `<tr>${Array.from({ length: c }, () => '<td>…</td>').join('')}</tr>`).join('')}</tbody></table>`; } },
    { t: 'box' as BlockType, label: 'ℹ️ Riquadro «Da sapere»', make: () => '<div class="box box-info"><b>Da sapere</b><p>Testo del riquadro</p></div>' }, { t: 'box' as BlockType, label: '⚠️ Riquadro «Attenzione»', make: () => '<div class="box box-warning"><b>Attenzione</b><p>Testo del riquadro</p></div>' }, { t: 'box' as BlockType, label: '❝ Citazione in evidenza', make: () => '<blockquote class="pull-quote">Citazione in evidenza</blockquote>' },
    { t: 'readalso' as BlockType, label: '📰 Leggi anche', make: () => { const u = prompt('URL dell\'articolo'); if (!u) return null; const t = prompt('Titolo') || u; return `<aside class="read-also"><span>Leggi anche</span><a href="${u}">${escapeHtml(t)}</a></aside>`; } },
    { t: 'box' as BlockType, label: '🧭 Cosa sappiamo / non sappiamo', make: () => '<div class="know-box"><div class="know-yes"><b>Cosa sappiamo</b><ul><li>…</li></ul></div><div class="know-no"><b>Cosa non sappiamo</b><ul><li>…</li></ul></div></div>' },
    { t: 'timeline' as BlockType, label: '🕒 Timeline', make: () => { const t = prompt('Una tappa per riga: data | titolo | testo', '2024 | Inizio | Cosa è successo'); if (!t) return null; return `<div class="timeline">${t.split('\n').map((l) => l.split('|')).filter((p) => p[0]).map((p) => `<div class="tl-item"><time>${escapeHtml(p[0].trim())}</time><div><b>${escapeHtml((p[1] ?? '').trim())}</b><p>${escapeHtml((p[2] ?? '').trim())}</p></div></div>`).join('')}</div>`; } },
    { t: 'beforeafter' as BlockType, label: '🔀 Foto prima / dopo', make: () => { const a = prompt('URL foto «prima»'); if (!a) return null; const b = prompt('URL foto «dopo»'); if (!b) return null; return `<div class="before-after" style="--ba:50%"><img src="${a}" alt="Prima" /><img src="${b}" alt="Dopo" /><input type="range" min="0" max="100" value="50" aria-label="Confronta prima e dopo" oninput="this.parentNode.style.setProperty('--ba', this.value + '%')" /><span class="ba-label ba-before">Prima</span><span class="ba-label ba-after">Dopo</span></div>`; } },
    { t: 'chart' as BlockType, label: '📈 Grafico da dati', make: () => { const d = prompt('Dati, uno per riga: etichetta, valore', 'Gennaio, 12\nFebbraio, 18\nMarzo, 9'); if (!d) return null; const { labels, values } = parseChartData(d); if (!values.length) return null; const kind = (prompt('Tipo: barre o linee', 'barre') || 'barre').startsWith('l') ? 'line' : 'bar'; return chartSvg(kind, labels, values, prompt('Titolo del grafico') || ''); } },
    { t: 'table' as BlockType, label: '📋 Tabella da CSV / Excel', make: () => { const c = prompt('Incolla i dati (colonne separate da ; , o tab, prima riga = intestazioni)'); return c ? csvToTable(c) : null; } },
    { t: 'embed' as BlockType, label: '📄 PDF', make: () => { const u = prompt('URL del PDF'); return u ? `<div class="embed-pdf"><iframe src="${u}#toolbar=0" loading="lazy" title="Documento PDF"></iframe><a href="${u}" target="_blank" rel="noopener">Apri o scarica il PDF</a></div>` : null; } },
    { t: 'embed' as BlockType, label: '🎧 Audio / podcast', make: () => { const u = prompt('URL del file audio (mp3) oppure link Spotify / Apple Podcasts'); if (!u) return null; if (/spotify\.com/.test(u)) return `<div class="embed-podcast"><iframe src="${u.replace('open.spotify.com/', 'open.spotify.com/embed/')}" loading="lazy" allow="encrypted-media" title="Podcast"></iframe></div>`; if (/podcasts\.apple\.com/.test(u)) return `<div class="embed-podcast"><iframe src="${u.replace('podcasts.apple.com', 'embed.podcasts.apple.com')}" loading="lazy" title="Podcast"></iframe></div>`; return `<figure class="audio-embed"><audio controls preload="none" src="${u}"></audio><figcaption>${escapeHtml(prompt('Didascalia') || '')}</figcaption></figure>`; } },
    { t: 'layered' as BlockType, label: '🎚 Paragrafo a strati (breve / normale / completo)', make: () => '<div class="layered"><div data-depth="1"><p></p></div><div data-depth="2"><p></p></div><div data-depth="3"><p></p></div></div>' },
    { t: 'circle' as BlockType, label: '🔒 Solo per una cerchia (o solo per me)', make: () => null },
    { t: 'html' as BlockType, label: '👥 Racconto a più voci', make: () => { const names = (prompt('Chi racconta? Nomi separati da virgola (da 2 a 4)', 'Anna, Marco') ?? '').split(',').map((n) => n.trim()).filter(Boolean).slice(0, 4); return names.length < 2 ? null : `<div class="voices voices-${names.length}">${names.map((n) => `<section><h4>${n.replace(/</g, '&lt;')}</h4><p>Il racconto di ${n.replace(/</g, '&lt;')}…</p></section>`).join('')}</div>`; } },
    { t: 'snippet' as BlockType, label: '♻️ Blocco riutilizzabile', make: () => null },
    { t: 'quiz' as BlockType, label: '🧠 Quiz con classifica', make: () => { const title = prompt('Titolo del quiz'); if (!title) return null; const qs: { q: string; options: string[]; answer: number }[] = []; for (let i = 1; i <= 10; i++) { const q = prompt(`Domanda ${i} (vuoto per finire)`); if (!q) break; const opts = (prompt('Risposte separate da ; (la prima è quella giusta)') || '').split(';').map((x) => x.trim()).filter(Boolean); if (opts.length < 2) break; const answer = Math.floor(Math.random() * opts.length); const first = opts[0]; opts.splice(0, 1); opts.splice(answer, 0, first); qs.push({ q, options: opts, answer }); } if (!qs.length) return null; const def = { id: 'qz' + Math.random().toString(36).slice(2, 8), title, questions: qs }; return `<div data-quiz="${escapeHtml(JSON.stringify(def))}" class="quiz-placeholder">🧠 Quiz: ${escapeHtml(title)} (${qs.length} domande)</div>`; } },
    { t: 'poll' as BlockType, label: '📊 Sondaggio', make: () => null }, { t: 'divider' as BlockType, label: '— Separatore', make: () => '<hr />' }, { t: 'html' as BlockType, label: '</> HTML libero', make: () => '<div></div>' },
  ], []);
  const add = async (index: number, item: (typeof menu)[number]) => {
    if (item.t === 'image') { if (onPickImage) { onPickImage((url, alt) => insertAt(index, { id: uid(), type: 'image', html: `<figure><img src="${url}" alt="${escapeHtml(alt)}" /><figcaption>${escapeHtml(alt)}</figcaption></figure>` })); } else { const u = prompt('URL immagine'); if (u) insertAt(index, { id: uid(), type: 'image', html: `<figure><img src="${u}" alt="" /><figcaption></figcaption></figure>` }); } return; }
    if (item.t === 'circle') { const list = [{ id: '__me', name: 'Solo io (diario privato)' }, ...(await circlesAction())]; const pick = prompt('Chi può leggere questo passaggio?\n' + list.map((x, i) => `${i + 1}. ${x.name}`).join('\n'), '1'); const sel = list[Number(pick) - 1]; if (!sel) return; const text = prompt(`Testo riservato a «${sel.name}»`) ?? ''; insertAt(index, { id: uid(), type: 'circle', html: `<div class="circle-only" data-circle="${sel.id}"><p>${escapeHtml(text)}</p></div>` }); return; }
    if (item.t === 'snippet') { const list = await listSnippetsAction(); if (!list.length) { toast.error('Nessun blocco riutilizzabile: creane uno in Redazione → Blocchi riutilizzabili.'); return; } const pick = prompt('Quale blocco?\n' + list.map((x, i) => `${i + 1}. ${x.name}`).join('\n'), '1'); const sel = list[Number(pick) - 1]; if (!sel) return; insertAt(index, { id: uid(), type: 'snippet', html: `<div data-snippet="${sel.id}" class="snippet-ref">♻️ ${escapeHtml(sel.name)}</div>` }); return; }
    if (item.t === 'poll') { const q = prompt('Domanda del sondaggio'); if (!q) return; const o = prompt('Risposte separate da virgola'); if (!o) return; const r = await createPollAction(articleId, q, o.split(',')); if (!r.ok || !r.poll) { toast.error(r.message ?? 'Errore'); return; } insertAt(index, { id: uid(), type: 'poll', html: `<div data-poll="${r.poll.id}" class="poll-placeholder">📊 Sondaggio: ${escapeHtml(r.poll.question)}</div>` }); return; }
    const html = item.make(); if (html) insertAt(index, { id: uid(), type: item.t, html });
  };
  const Inserter = ({ index }: { index: number }) => (
    <div className={`blk-inserter ${inserter === index ? 'open' : ''}`}>
      <button type="button" className="blk-plus" onClick={() => setInserter(inserter === index ? null : index)} title="Inserisci blocco">＋</button>
      {inserter === index && <div className="blk-menu">{menu.map((m, i) => <button key={i} type="button" onClick={() => add(index, m)}>{m.label}</button>)}</div>}
    </div>
  );
  return (
    <div className="block-editor" onClick={(e) => { if (!(e.target as HTMLElement).closest('.blk-inserter')) setInserter(null); }}>
      <Inserter index={0} />
      {blocks.map((b, i) => (
        <div key={b.id}>
          <div className={`blk ${drag === b.id ? 'dragging' : ''}`} draggable onDragStart={() => setDrag(b.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(b.id)} onDragEnd={() => setDrag(null)}>
            <NewBlockListener onNew={() => insertAt(i + 1, { id: uid(), type: 'paragraph', html: '<p></p>' })} onPaste={(html) => { const parsed = parseBlocks(html); const n = [...blocks]; n.splice(i + 1, 0, ...parsed); commit(n); }} />
            <div className="blk-side">
              <span className="blk-handle" title="Trascina per spostare">⋮⋮</span>
              {['paragraph', 'heading2', 'heading3', 'quote', 'list'].includes(b.type) ? <select className="blk-type" value={b.type} onChange={(e) => changeType(b.id, e.target.value as BlockType)}><option value="paragraph">Paragrafo</option><option value="heading2">Titolo H2</option><option value="heading3">Titolo H3</option><option value="quote">Citazione</option><option value="list">Elenco</option></select> : <span className="blk-type-label">{LABEL[b.type]}</span>}
              <span className="blk-actions"><button type="button" onClick={() => move(b.id, -1)} title="Sposta su">↑</button><button type="button" onClick={() => move(b.id, 1)} title="Sposta giù">↓</button><button type="button" onClick={() => remove(b.id)} title="Elimina" className="danger">✕</button></span>
            </div>
            {['paragraph', 'heading2', 'heading3', 'quote', 'list'].includes(b.type) ? <TextBlock block={b} onChange={(h) => update(b.id, h)} placeholder={b.type === 'heading2' ? 'Titolo di sezione' : b.type === 'heading3' ? 'Sottotitolo' : b.type === 'quote' ? 'Citazione' : 'Scrivi qui…'} />
              : b.type === 'image' ? <ImageBlock html={b.html} onChange={(h) => update(b.id, h)} />
              : b.type === 'layered' ? <LayeredBlock html={b.html} onChange={(h) => update(b.id, h)} />
              : <RawBlock html={b.html} type={b.type} onChange={(h) => update(b.id, h)} />}
          </div>
          <Inserter index={i + 1} />
        </div>
      ))}
    </div>
  );
}
/** Ascolta l'evento personalizzato "newblock" emesso da Invio in un paragrafo. */
function NewBlockListener({ onNew, onPaste }: { onNew: () => void; onPaste?: (html: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { const parent = ref.current?.parentElement; if (!parent) return; const h = () => onNew(); const p = (e: Event) => { e.stopPropagation(); onPaste?.((e as CustomEvent<string>).detail); }; parent.addEventListener('newblock', h); parent.addEventListener('pasteblocks', p); return () => { parent.removeEventListener('newblock', h); parent.removeEventListener('pasteblocks', p); }; }, [onNew, onPaste]);
  return <span ref={ref} hidden />;
}

function ImageBlock({ html, onChange }: { html: string; onChange: (h: string) => void }) {
  const m = html.match(/<img[^>]*src="([^"]*)"[^>]*(?:alt="([^"]*)")?/); const src = m?.[1] ?? ''; const alt = html.match(/alt="([^"]*)"/)?.[1] ?? ''; const cap = html.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '';
  const set = (a: string, c: string) => onChange(`<figure><img src="${src}" alt="${escapeHtml(a)}" /><figcaption>${escapeHtml(c)}</figcaption></figure>`);
  return <div className="blk-image">{src && <img src={src} alt={alt} />}<input className="input" placeholder="Testo alternativo (accessibilità e Google)" value={alt} onChange={(e) => set(e.target.value, cap)} /><input className="input" placeholder="Didascalia / credit" value={cap} onChange={(e) => set(alt, e.target.value)} /></div>;
}
function RawBlock({ html, type, onChange }: { html: string; type: BlockType; onChange: (h: string) => void }) {
  const [edit, setEdit] = useState(false);
  return <div className="blk-raw">{edit ? <textarea className="textarea" style={{ fontFamily: 'monospace', fontSize: 12, minHeight: 90 }} value={html} onChange={(e) => onChange(e.target.value)} onBlur={() => setEdit(false)} autoFocus /> : <div className="blk-preview" onDoubleClick={() => setEdit(true)}><div className="article-body" dangerouslySetInnerHTML={{ __html: html }} /><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(true)}>Modifica {LABEL[type].toLowerCase()}</button></div>}</div>;
}

/** Paragrafo a strati: tre versioni dello stesso passaggio. Se «in breve» o «completo» restano vuoti, vale la versione normale. */
function LayeredBlock({ html, onChange }: { html: string; onChange: (h: string) => void }) {
  const read = (d: number) => (html.match(new RegExp(`<div data-depth="${d}">([\\s\\S]*?)</div>`))?.[1] ?? '').replace(/<\/p>\s*<p>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const [v, setV] = useState<[string, string, string]>([read(1), read(2), read(3)]);
  const toHtml = (t: string) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${escapeHtml(x)}</p>`).join('');
  const emit = (n: [string, string, string]) => { setV(n); const mid = n[1] || n[0] || n[2]; onChange(`<div class="layered"><div data-depth="1">${toHtml(n[0] || mid)}</div><div data-depth="2">${toHtml(mid)}</div><div data-depth="3">${toHtml(n[2] || mid)}</div></div>`); };
  const L = ['In breve (una frase)', 'Normale', 'Completo (con dettagli e contesto)'];
  return <div className="blk-layered">{[0, 1, 2].map((i) => <label key={i}><span>{L[i]} · {v[i].split(/\s+/).filter(Boolean).length} parole</span><textarea className="textarea" style={{ minHeight: i === 0 ? 44 : i === 1 ? 80 : 130 }} value={v[i]} onChange={(e) => { const n = [...v] as [string, string, string]; n[i] = e.target.value; emit(n); }} placeholder={i === 1 ? 'La versione che legge chi non tocca il cursore' : i === 0 ? 'Vuoto = uguale alla normale' : 'Vuoto = uguale alla normale'} /></label>)}</div>;
}
