'use client';

import { useEffect, useRef, useState } from 'react';

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(false);
  useEffect(() => { const el = ref.current; if (el && !html && el.innerHTML !== value) el.innerHTML = value; }, [value, html]);
  const emit = () => { if (ref.current) onChange(ref.current.innerHTML); };
  const cmd = (e: React.MouseEvent, command: string, arg?: string) => { e.preventDefault(); document.execCommand(command, false, arg); emit(); };
  const link = (e: React.MouseEvent) => { e.preventDefault(); const url = prompt('Indirizzo del link (https://...)'); if (url) { document.execCommand('createLink', false, url); emit(); } };
  const image = (e: React.MouseEvent) => { e.preventDefault(); const url = prompt('URL immagine'); if (url) { document.execCommand('insertHTML', false, `<figure><img src="${url}" alt="" /><figcaption>Didascalia</figcaption></figure><p></p>`); emit(); } };
  const video = (e: React.MouseEvent) => { e.preventDefault(); const url = prompt('URL video YouTube'); if (!url) return; const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); document.execCommand('insertHTML', false, `<iframe src="https://www.youtube.com/embed/${m ? m[1] : url}" allowfullscreen></iframe><p></p>`); emit(); };
  const B = ({ t, children, onMouseDown, active }: { t: string; children: React.ReactNode; onMouseDown: (e: React.MouseEvent) => void; active?: boolean }) => <button type="button" title={t} className={active ? 'active' : undefined} onMouseDown={onMouseDown}>{children}</button>;
  return (
    <div className="rte">
      <div className="rte-toolbar">
        <B t="Grassetto" onMouseDown={(e) => cmd(e, 'bold')}><b>B</b></B><B t="Corsivo" onMouseDown={(e) => cmd(e, 'italic')}><i>I</i></B><B t="Sottolineato" onMouseDown={(e) => cmd(e, 'underline')}><u>U</u></B>
        <span className="sep" />
        <B t="Paragrafo" onMouseDown={(e) => cmd(e, 'formatBlock', 'p')}>¶</B><B t="Titolo H2" onMouseDown={(e) => cmd(e, 'formatBlock', 'h2')}>H2</B><B t="Titolo H3" onMouseDown={(e) => cmd(e, 'formatBlock', 'h3')}>H3</B><B t="Citazione" onMouseDown={(e) => cmd(e, 'formatBlock', 'blockquote')}>❝</B>
        <span className="sep" />
        <B t="Elenco puntato" onMouseDown={(e) => cmd(e, 'insertUnorderedList')}>•≡</B><B t="Elenco numerato" onMouseDown={(e) => cmd(e, 'insertOrderedList')}>1≡</B>
        <span className="sep" />
        <B t="Link" onMouseDown={link}>🔗</B><B t="Immagine da URL" onMouseDown={image}>🖼</B><B t="Video YouTube" onMouseDown={video}>▶</B>
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
