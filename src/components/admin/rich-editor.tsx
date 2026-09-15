'use client';

import { useEffect, useRef, useState } from 'react';
import { createPollAction } from '@/lib/actions-editorial';
import { toast } from '@/components/ui/toaster';

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export function RichEditor({ value, onChange, articleId = '', onPickImage }: { value: string; onChange: (html: string) => void; articleId?: string; onPickImage?: (cb: (url: string, alt: string) => void) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(false);
  useEffect(() => { const el = ref.current; if (el && !html && el.innerHTML !== value) el.innerHTML = value; }, [value, html]);
  const emit = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const cmd = (e: React.MouseEvent, command: string, arg?: string) => { e.preventDefault(); document.execCommand(command, false, arg); emit(); };
  const insert = (h: string) => { ref.current?.focus(); document.execCommand('insertHTML', false, h + '<p></p>'); emit(); };
  const link = (e: React.MouseEvent) => { e.preventDefault(); const url = prompt('Indirizzo del link (https://...)'); if (url) { document.execCommand('createLink', false, url); emit(); } };
  const image = (e: React.MouseEvent) => { e.preventDefault(); if (onPickImage) { onPickImage((url, alt) => insert(`<figure><img src="${url}" alt="${escapeHtml(alt)}" /><figcaption>${escapeHtml(alt)}</figcaption></figure>`)); return; } const url = prompt('URL immagine'); if (url) insert(`<figure><img src="${url}" alt="" /><figcaption>Didascalia</figcaption></figure>`); };
  const video = (e: React.MouseEvent) => { e.preventDefault(); const url = prompt('URL video YouTube'); if (!url) return; const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); insert(`<div class="embed-video"><iframe src="https://www.youtube.com/embed/${m ? m[1] : url}" allowfullscreen loading="lazy" title="Video"></iframe></div>`); };
  const instagram = () => { const url = prompt('Link del post Instagram (https://www.instagram.com/p/...)'); if (!url) return; const clean = url.split('?')[0].replace(/\/?$/, '/'); insert(`<blockquote class="instagram-media" data-instgrm-permalink="${clean}" data-instgrm-version="14"><a href="${clean}">Vedi il post su Instagram</a></blockquote>`); };
  const xpost = () => { const url = prompt('Link del post su X (https://x.com/utente/status/...)'); if (!url) return; insert(`<blockquote class="twitter-tweet"><a href="${url.replace('x.com', 'twitter.com')}">Vedi il post su X</a></blockquote>`); };
  const tiktok = () => { const url = prompt('Link del video TikTok'); if (!url) return; const id = url.match(/video\/(\d+)/)?.[1] ?? ''; insert(`<blockquote class="tiktok-embed" cite="${url}" data-video-id="${id}"><a href="${url}">Vedi il video su TikTok</a></blockquote>`); };
  const map = () => { const q = prompt('Indirizzo o luogo da mostrare sulla mappa'); if (!q) return; insert(`<div class="embed-map"><iframe src="https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed" loading="lazy" title="Mappa: ${escapeHtml(q)}" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`); };
  const table = () => { const r = Number(prompt('Righe', '3')) || 3; const c = Number(prompt('Colonne', '3')) || 3; insert(`<table><thead><tr>${Array.from({ length: c }, (_, i) => `<th>Colonna ${i + 1}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: r - 1 }, () => `<tr>${Array.from({ length: c }, () => '<td>…</td>').join('')}</tr>`).join('')}</tbody></table>`); };
  const gallery = () => { const urls = prompt('URL delle immagini separati da virgola'); if (!urls) return; insert(`<div class="inline-gallery">${urls.split(',').map((u) => u.trim()).filter(Boolean).map((u) => `<figure><img src="${u}" alt="" loading="lazy" /><figcaption>Didascalia</figcaption></figure>`).join('')}</div>`); };
  const readAlso = () => { const url = prompt('URL dell\'articolo da consigliare'); if (!url) return; const title = prompt('Titolo da mostrare') || url; insert(`<aside class="read-also"><span>Leggi anche</span><a href="${url}">${escapeHtml(title)}</a></aside>`); };
  const poll = async () => { const q = prompt('Domanda del sondaggio'); if (!q) return; const opts = prompt('Risposte separate da virgola (2-8)'); if (!opts) return; const r = await createPollAction(articleId, q, opts.split(',')); if (!r.ok || !r.poll) { toast.error(r.message ?? 'Errore'); return; } insert(`<div data-poll="${r.poll.id}" class="poll-placeholder">📊 Sondaggio: ${escapeHtml(r.poll.question)} (${r.poll.options.length} risposte)</div>`); };
  const box = (kind: 'info' | 'warning' | 'quote') => insert(kind === 'quote' ? '<blockquote class="pull-quote">Citazione in evidenza</blockquote>' : `<div class="box box-${kind}"><b>${kind === 'info' ? 'Da sapere' : 'Attenzione'}</b><p>Testo del riquadro</p></div>`);
  const B = ({ t, children, onMouseDown, active }: { t: string; children: React.ReactNode; onMouseDown: (e: React.MouseEvent) => void; active?: boolean }) => <button type="button" title={t} className={active ? 'active' : undefined} onMouseDown={onMouseDown}>{children}</button>;
  const M = ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" onMouseDown={(e) => { e.preventDefault(); onClick(); }}>{label}</button>;
  return (
    <div className="rte">
      <div className="rte-toolbar">
        <B t="Grassetto" onMouseDown={(e) => cmd(e, 'bold')}><b>B</b></B><B t="Corsivo" onMouseDown={(e) => cmd(e, 'italic')}><i>I</i></B><B t="Sottolineato" onMouseDown={(e) => cmd(e, 'underline')}><u>U</u></B>
        <span className="sep" />
        <B t="Paragrafo" onMouseDown={(e) => cmd(e, 'formatBlock', 'p')}>¶</B><B t="Titolo H2" onMouseDown={(e) => cmd(e, 'formatBlock', 'h2')}>H2</B><B t="Titolo H3" onMouseDown={(e) => cmd(e, 'formatBlock', 'h3')}>H3</B><B t="Citazione" onMouseDown={(e) => cmd(e, 'formatBlock', 'blockquote')}>❝</B>
        <span className="sep" />
        <B t="Elenco puntato" onMouseDown={(e) => cmd(e, 'insertUnorderedList')}>•≡</B><B t="Elenco numerato" onMouseDown={(e) => cmd(e, 'insertOrderedList')}>1≡</B>
        <span className="sep" />
        <B t="Link" onMouseDown={link}>🔗</B><B t="Immagine" onMouseDown={image}>🖼</B><B t="Video YouTube" onMouseDown={video}>▶</B>
        <span className="menu"><button type="button" onMouseDown={(e) => e.preventDefault()}>＋ Inserisci ▾</button>
          <div className="menu-list">
            <M label="📷 Post Instagram" onClick={instagram} /><M label="𝕏 Post su X" onClick={xpost} /><M label="🎵 Video TikTok" onClick={tiktok} /><M label="🗺 Mappa" onClick={map} /><M label="▦ Tabella" onClick={table} /><M label="🖼 Galleria con didascalie" onClick={gallery} /><M label="📰 Box «Leggi anche»" onClick={readAlso} /><M label="📊 Sondaggio" onClick={poll} /><M label="ℹ️ Riquadro «Da sapere»" onClick={() => box('info')} /><M label="⚠️ Riquadro «Attenzione»" onClick={() => box('warning')} /><M label="❝ Citazione in evidenza" onClick={() => box('quote')} />
          </div></span>
        <span className="sep" />
        <B t="Rimuovi formattazione" onMouseDown={(e) => cmd(e, 'removeFormat')}>Tx</B><B t="Annulla" onMouseDown={(e) => cmd(e, 'undo')}>↶</B><B t="Ripeti" onMouseDown={(e) => cmd(e, 'redo')}>↷</B>
        <span className="sep" />
        <B t="Sorgente HTML" active={html} onMouseDown={(e) => { e.preventDefault(); setHtml((v) => !v); }}>&lt;/&gt;</B>
      </div>
      {html ? (
        <textarea className="textarea" style={{ border: 0, minHeight: 420, fontFamily: 'monospace', fontSize: 13 }} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div ref={ref} className="rte-content" contentEditable suppressContentEditableWarning data-placeholder="Scrivi qui il corpo dell'articolo..." onInput={emit}
          onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }} />
      )}
    </div>
  );
}
