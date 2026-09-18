'use client';
import { useEffect, useState, useTransition } from 'react';
import { coreadCreateAction, saveSpotAction } from '@/lib/actions-reading';
import { depthForMinutes, paragraphsForMinutes } from '@/lib/reading';
import type { AltVersion } from '@/lib/models';

/** Modi di leggere: «ho N minuti», versione per bambini, lingua facile, continua su un altro dispositivo, leggi insieme. */
export function ReadingModes({ articleId, title, kids, easy, layeredMinutes, coread }: { articleId: string; title: string; kids?: AltVersion; easy?: AltVersion; layeredMinutes?: number[]; coread?: string }) {
  const [minutes, setMinutes] = useState(0); const [alt, setAlt] = useState<'' | 'kids' | 'easy'>(''); const [code, setCode] = useState(''); const [room, setRoom] = useState(coread ?? ''); const [hiddenMin, setHiddenMin] = useState(0); const [pending, start] = useTransition();
  useEffect(() => {
    const body = document.querySelector('.article-body'); if (!body) return; const blocks = Array.from(body.children).filter((el) => !el.matches('.footnotes')) as HTMLElement[]; blocks.forEach((b) => b.classList.remove('time-cut')); setHiddenMin(0); if (!minutes) return;
    if (layeredMinutes?.length) { document.documentElement.dataset.depth = String(depthForMinutes(layeredMinutes, minutes)); return; }
    const words = blocks.map((b) => (b.textContent ?? '').split(/\s+/).filter(Boolean).length); const keep = paragraphsForMinutes(words, minutes); blocks.slice(keep).forEach((b) => b.classList.add('time-cut')); setHiddenMin(Math.ceil(words.slice(keep).reduce((n, w) => n + w, 0) / 200));
  }, [minutes, layeredMinutes]);
  useEffect(() => { document.querySelector('.article-body')?.classList.toggle('alt-hidden', !!alt); }, [alt]);
  const v = alt === 'kids' ? kids : alt === 'easy' ? easy : undefined;
  return (
    <div className="reading-modes">
      <div className="lens-btns" role="group" aria-label="Adatta la lettura">
        <label className="time-pick">⏱ Ho <select aria-label="Quanti minuti hai" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}><option value={0}>tutto il tempo</option><option value={2}>2 minuti</option><option value={4}>4 minuti</option><option value={8}>8 minuti</option></select></label>
        {kids && <button type="button" className={alt === 'kids' ? 'on' : ''} aria-pressed={alt === 'kids'} onClick={() => setAlt(alt === 'kids' ? '' : 'kids')}>🧒 Per bambini</button>}
        {easy && <button type="button" className={alt === 'easy' ? 'on' : ''} aria-pressed={alt === 'easy'} onClick={() => setAlt(alt === 'easy' ? '' : 'easy')}>🔤 Lingua facile</button>}
        <button type="button" disabled={pending} onClick={() => start(async () => { const max = document.documentElement.scrollHeight - innerHeight; const r = await saveSpotAction(location.pathname, max > 0 ? scrollY / max : 0, title); setCode(r.ok && r.code ? r.code : r.message ?? ''); })}>📍 Continua altrove</button>
        {!room && <button type="button" disabled={pending} onClick={() => start(async () => { const r = await coreadCreateAction(articleId); if (r.ok && r.code) { setRoom(r.code); history.replaceState(null, '', `?insieme=${r.code}`); location.reload(); } })}>👥 Leggi insieme</button>}
      </div>
      {code && <p className="spot-code" role="status">{code.includes('-') ? <>Il tuo codice: <b>{code}</b>. Su un altro dispositivo apri <a href="/riprendi">/riprendi</a> e scrivi le tre parole. Vale 30 giorni, senza account.</> : code}</p>}
      {room && <p className="spot-code" role="status">Stai leggendo insieme ad altri nella stanza <b>{room}</b>: le sottolineature sono in comune. <button type="button" className="linklike" onClick={() => navigator.clipboard?.writeText(location.href)}>Copia il link da mandare</button></p>}
      {hiddenMin > 0 && <p className="time-more">Ti abbiamo mostrato l&apos;essenziale per {minutes} minuti. <button type="button" className="linklike" onClick={() => setMinutes(0)}>Leggi tutto (altri {hiddenMin} min)</button></p>}
      {v && <section className="alt-version" aria-label={alt === 'kids' ? 'Versione per bambini' : 'Versione in lingua facile'}><p className="alt-note">{alt === 'kids' ? 'Versione per bambini, riletta dalla redazione.' : 'Versione in lingua facile, riletta dalla redazione.'}</p><div dangerouslySetInnerHTML={{ __html: v.html }} />{v.glossary.length > 0 && <dl className="alt-glossary">{v.glossary.map((g) => <div key={g.term}><dt>{g.term}</dt><dd>{g.meaning}</dd></div>)}</dl>}</section>}
    </div>
  );
}
