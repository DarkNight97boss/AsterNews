'use client';
import { useEffect } from 'react';

/** Bilancio dell'attenzione: i secondi passati a leggere restano nel browser del lettore (mai inviati al server) e alimentano /attenzione. */
export const ATTENTION_KEY = 'aster_attention';
export interface AttentionEntry { day: string; cat: string; sec: number }
export function AttentionTracker({ category }: { category: string }) {
  useEffect(() => {
    let sec = 0; const tick = setInterval(() => { if (document.visibilityState === 'visible') sec += 5; }, 5000);
    const flush = () => { if (sec < 5) return; try { const day = new Date().toISOString().slice(0, 10); const all = JSON.parse(localStorage.getItem(ATTENTION_KEY) ?? '[]') as AttentionEntry[]; const cur = all.find((x) => x.day === day && x.cat === category); if (cur) cur.sec += sec; else all.push({ day, cat: category, sec }); const min = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10); localStorage.setItem(ATTENTION_KEY, JSON.stringify(all.filter((x) => x.day >= min))); sec = 0; } catch { /* archivio non disponibile */ } };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); }; document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', flush);
    return () => { clearInterval(tick); flush(); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); };
  }, [category]);
  return null;
}
