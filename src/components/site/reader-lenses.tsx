'use client';
import { useEffect, useState, useTransition } from 'react';
import { articleVersionsAction } from '@/lib/actions-lenses';

type CMap = { s: string; level: 1 | 2 | 3 }[];
const LEVEL = { 1: 'non sostenuta nel testo', 2: 'attribuzione vaga', 3: 'fonte nominata' } as const;
function paint(map: CMap) {
  const root = document.querySelector('.article-body'); if (!root) return; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes: Text[] = []; while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const m of map) { const needle = m.s.trim().replace(/…$/, ''); if (needle.length < 8) continue; const node = nodes.find((n) => n.data.includes(needle) && !(n.parentElement?.closest('.certainty-mark'))); if (!node) continue;
    const startAt = node.data.indexOf(needle); const rest = node.data.slice(startAt); const end = rest.search(/[.!?…](\s|$)/); const len = end === -1 ? rest.length : end + 1;
    const target = node.splitText(startAt); target.splitText(len); const span = document.createElement('mark'); span.className = `certainty-mark cl-${m.level}`; span.title = LEVEL[m.level]; target.replaceWith(span); span.appendChild(target); }
}
function unpaint() { document.querySelectorAll('.article-body .certainty-mark').forEach((el) => { el.replaceWith(...Array.from(el.childNodes)); }); document.querySelector('.article-body')?.normalize(); }
/** Le lenti del lettore: com'era l'articolo a un'altra ora, le note dell'autore, quanto è sostenuta ogni frase. */
export function ReaderLenses({ articleId, versions, hasNotes, certainty }: { articleId: string; versions: number; hasNotes: boolean; certainty?: CMap }) {
  const [notes, setNotes] = useState(false); const [cert, setCert] = useState(false); const [list, setList] = useState<{ at: string; title: string; html: string }[] | null>(null); const [i, setI] = useState(0); const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  useEffect(() => { if (notes) document.documentElement.dataset.notes = '1'; else delete document.documentElement.dataset.notes; return () => { delete document.documentElement.dataset.notes; }; }, [notes]);
  useEffect(() => { if (cert && certainty) paint(certainty); else unpaint(); return unpaint; }, [cert, certainty]);
  if (!hasNotes && !certainty?.length && versions < 1) return null;
  const when = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); const cur = list?.[i];
  return (
    <div className="reader-lenses">
      <div className="lens-btns" role="group" aria-label="Modi di leggere questo articolo">
        {hasNotes && <button type="button" className={notes ? 'on' : ''} aria-pressed={notes} onClick={() => setNotes(!notes)}>✎ Note dell&apos;autore</button>}
        {!!certainty?.length && <button type="button" className={cert ? 'on' : ''} aria-pressed={cert} onClick={() => setCert(!cert)}>🎚 Mappa della certezza</button>}
        {versions >= 1 && <button type="button" className={open ? 'on' : ''} aria-pressed={open} disabled={pending} onClick={() => { if (open) { setOpen(false); return; } setOpen(true); if (!list) start(async () => { const v = await articleVersionsAction(articleId); setList(v); setI(Math.max(0, v.length - 1)); }); }}>🕰 Com&apos;era prima</button>}
      </div>
      {cert && <p className="lens-legend"><mark className="certainty-mark cl-3">fonte nominata</mark> <mark className="certainty-mark cl-2">attribuzione vaga</mark> <mark className="certainty-mark cl-1">non sostenuta nel testo</mark></p>}
      {open && <div className="time-travel">{!list ? <p className="help">Carico le versioni…</p> : list.length < 2 ? <p className="help">Questo articolo non è mai stato modificato dopo la pubblicazione.</p> : <>
        <label htmlFor="tt-range">Trascina per vedere il testo com&apos;era: <b>{cur ? when(cur.at) : ''}</b>{i === list.length - 1 ? ' (versione attuale)' : ''}</label>
        <input id="tt-range" type="range" min={0} max={list.length - 1} step={1} value={i} onChange={(e) => setI(Number(e.target.value))} aria-valuetext={cur ? when(cur.at) : ''} />
        {cur && i < list.length - 1 && <div className="tt-version"><h3>{cur.title}</h3><div className="article-body-past" dangerouslySetInnerHTML={{ __html: cur.html }} /></div>}</>}</div>}
    </div>
  );
}
