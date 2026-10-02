'use client';
import { useEffect, useState } from 'react';
import { personalMinutes, smoothWpm, wpmFrom } from '@/lib/service';

const KEY = 'aster_wpm';
/** Tempo di lettura personale: misura quanto ci metti davvero (resta nel browser) e stima i prossimi articoli con il tuo ritmo. */
export function PersonalTime({ words }: { words: number }) {
  const [wpm, setWpm] = useState<number | null>(null);
  useEffect(() => {
    try { const v = Number(localStorage.getItem(KEY)); if (v > 0) setWpm(v); } catch { /* */ }
    const t0 = Date.now(); let visible = 0, last = Date.now(), maxScroll = 0;
    const onVis = () => { if (document.hidden) visible += Date.now() - last; else last = Date.now(); };
    const onScroll = () => { const h = document.documentElement; maxScroll = Math.max(maxScroll, (h.scrollTop + innerHeight) / h.scrollHeight); };
    const finish = () => { if (!document.hidden) visible += Date.now() - last; last = Date.now(); if (maxScroll < 0.85) return; const next = wpmFrom(words, visible / 1000); if (!next) return; try { const old = Number(localStorage.getItem(KEY)) || null; localStorage.setItem(KEY, String(smoothWpm(old, next))); } catch { /* */ } };
    document.addEventListener('visibilitychange', onVis); addEventListener('scroll', onScroll, { passive: true }); addEventListener('pagehide', finish);
    return () => { document.removeEventListener('visibilitychange', onVis); removeEventListener('scroll', onScroll); removeEventListener('pagehide', finish); void t0; };
  }, [words]);
  if (!wpm) return null;
  return <span className="personal-time" title={`Al tuo ritmo (${wpm} parole al minuto, misurato su questo dispositivo)`}> · per te ~{personalMinutes(words, wpm)} min</span>;
}
