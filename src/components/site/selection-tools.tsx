'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { coreadAddAction, coreadListAction, explainAction, highlightAction, thanksAction } from '@/lib/actions-reading';

type Top = { text: string; count: number; weight: 1 | 2 | 3 };
function wrap(needle: string, cls: string, title: string) {
  const root = document.querySelector('.article-body'); if (!root) return; const n = needle.trim().slice(0, 60); if (n.length < 8) return; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const node = walker.currentNode as Text; const at = node.data.toLowerCase().indexOf(n.toLowerCase()); if (at === -1 || node.parentElement?.closest(`.${cls.split(' ')[0]}`)) continue; const target = node.splitText(at); target.splitText(Math.min(target.data.length, needle.trim().length)); const m = document.createElement('mark'); m.className = cls; m.title = title; target.replaceWith(m); m.appendChild(target); return; }
}
/** Strumenti sul testo selezionato: sottolinea (collettivo), ringrazia per questo passaggio, spiegami, cartolina, leggi insieme. */
export function SelectionTools({ articleId, title, top, coread }: { articleId: string; title: string; top: Top[]; coread?: string }) {
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null); const [msg, setMsg] = useState(''); const [explain, setExplain] = useState<{ text?: string; links?: { title: string; url: string }[] } | null>(null); const [pending, start] = useTransition(); const who = useRef('');
  useEffect(() => { for (const t of top) wrap(t.text, `hl-collective w-${t.weight}`, `Sottolineato da ${t.count} lettori`); }, [top]);
  useEffect(() => { const pos = Number(new URLSearchParams(location.search).get('pos')); if (pos > 0 && pos <= 1) setTimeout(() => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * pos, behavior: 'smooth' }), 400); }, []);
  const pull = useCallback(() => { if (!coread) return; coreadListAction(articleId, coread).then((list) => { for (const h of list) wrap(h.text, 'hl-coread', `Sottolineato da ${h.who}`); }).catch(() => {}); }, [articleId, coread]);
  useEffect(() => { if (!coread) return; try { who.current = localStorage.getItem('aster_coread_name') ?? ''; if (!who.current) { who.current = `Lettore ${Math.floor(Math.random() * 90 + 10)}`; localStorage.setItem('aster_coread_name', who.current); } } catch { /* */ } pull(); const t = setInterval(pull, 8000); return () => clearInterval(t); }, [coread, pull]);
  useEffect(() => {
    const onUp = () => setTimeout(() => { const s = window.getSelection(); const text = s?.toString().trim() ?? ''; const root = document.querySelector('.article-body'); if (!s || s.rangeCount === 0 || text.length < 12 || text.length > 400 || !root?.contains(s.anchorNode)) { setSel(null); return; } const r = s.getRangeAt(0).getBoundingClientRect(); setSel({ text, x: Math.min(Math.max(r.left + r.width / 2, 150), innerWidth - 150), y: Math.max(r.top - 8, 90) }); setExplain(null); }, 10);
    const onScroll = () => setSel((x) => (x && !document.querySelector('.sel-explain') ? null : x)); window.addEventListener('scroll', onScroll, { passive: true }); document.addEventListener('mouseup', onUp); document.addEventListener('touchend', onUp); document.addEventListener('keyup', onUp); return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mouseup', onUp); document.removeEventListener('touchend', onUp); document.removeEventListener('keyup', onUp); };
  }, []);
  const say = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 4000); };
  if (!sel) return msg ? <div className="sel-toast" role="status">{msg}</div> : null;
  const act = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => start(async () => { const r = await fn(); say(r.message ?? (r.ok ? 'Fatto.' : 'Errore')); if (r.ok) after?.(); setSel(null); window.getSelection()?.removeAllRanges(); });
  const card = `/api/cartolina?a=${encodeURIComponent(articleId)}&t=${encodeURIComponent(sel.text.slice(0, 220))}`;
  return (
    <>
      <div className="sel-tools" style={{ left: sel.x, top: sel.y }} role="toolbar" aria-label="Azioni sul testo selezionato" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" disabled={pending} onClick={() => act(() => (coread ? coreadAddAction(articleId, coread, who.current, sel.text) : highlightAction(articleId, sel.text)), () => wrap(sel.text, coread ? 'hl-coread' : 'hl-mine', 'Sottolineato da te'))}>🖍 Sottolinea</button>
        <button type="button" disabled={pending} onClick={() => act(() => thanksAction(articleId, sel.text))}>🙏 Grazie per questo</button>
        <button type="button" disabled={pending} onClick={() => start(async () => { const r = await explainAction(articleId, sel.text); if (!r.ok) say(r.message ?? ''); else setExplain({ text: r.text, links: r.links }); })}>💡 Spiegami</button>
        <a href={card} target="_blank" rel="noopener nofollow">✉️ Cartolina</a>
        <button type="button" onClick={() => { const u = `${location.origin}${location.pathname}#:~:text=${encodeURIComponent(sel.text.slice(0, 120))}`; navigator.clipboard?.writeText(u).then(() => say('Link al passaggio copiato.')).catch(() => say(u)); setSel(null); }}>🔗 Link</button>
        {explain && <div className="sel-explain" role="status">{explain.text && <p>{explain.text}</p>}{(explain.links ?? []).length > 0 && <><b>Dal nostro archivio</b><ul>{explain.links!.map((l) => <li key={l.url}><a href={l.url}>{l.title}</a></li>)}</ul></>}</div>}
      </div>
      {msg && <div className="sel-toast" role="status">{msg}</div>}
      <span hidden>{title}</span>
    </>
  );
}
