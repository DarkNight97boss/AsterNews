'use client';

import { useEffect, useState } from 'react';

type Prefs = { font: 'normal' | 'large' | 'xlarge'; contrast: 'normal' | 'high'; motion: 'normal' | 'reduce' };
const DEFAULT: Prefs = { font: 'normal', contrast: 'normal', motion: 'normal' };
function apply(p: Prefs) { const h = document.documentElement; h.dataset.a11yFont = p.font; h.dataset.a11yContrast = p.contrast; h.dataset.a11yMotion = p.motion; }

/** Strumenti di accessibilità: dimensione del testo, alto contrasto, meno animazioni e lettura ad alta voce dell'articolo. */
export function A11yBar() {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Prefs>(DEFAULT);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem('a11y') ?? 'null'); if (saved) { setP(saved); apply(saved); } } catch { /* ignore */ } }, []);
  const set = (patch: Partial<Prefs>) => { const n = { ...p, ...patch }; setP(n); apply(n); try { localStorage.setItem('a11y', JSON.stringify(n)); } catch { /* ignore */ } };
  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
    const body = document.querySelector('.article-body'); const title = document.querySelector('h1');
    const text = [title?.textContent, body?.textContent].filter(Boolean).join('. ').replace(/\s+/g, ' ').slice(0, 20000);
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text); u.lang = 'it-IT'; u.rate = 1; u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    speechSynthesis.cancel(); speechSynthesis.speak(u); setSpeaking(true);
  };
  return (
    <div className="a11y-bar">
      {open && (
        <div className="a11y-menu" role="group" aria-label="Accessibilità">
          <button className={p.font !== 'normal' ? 'on' : ''} onClick={() => set({ font: p.font === 'normal' ? 'large' : p.font === 'large' ? 'xlarge' : 'normal' })}>Testo più grande <span>{p.font === 'normal' ? 'A' : p.font === 'large' ? 'A+' : 'A++'}</span></button>
          <button className={p.contrast === 'high' ? 'on' : ''} onClick={() => set({ contrast: p.contrast === 'high' ? 'normal' : 'high' })}>Alto contrasto <span>{p.contrast === 'high' ? 'sì' : 'no'}</span></button>
          <button className={p.motion === 'reduce' ? 'on' : ''} onClick={() => set({ motion: p.motion === 'reduce' ? 'normal' : 'reduce' })}>Meno animazioni <span>{p.motion === 'reduce' ? 'sì' : 'no'}</span></button>
          <button className={speaking ? 'on' : ''} onClick={speak}>{speaking ? 'Ferma lettura' : 'Leggi ad alta voce'} <span>🔊</span></button>
          <button onClick={() => set(DEFAULT)}>Ripristina <span>↺</span></button>
        </div>
      )}
      <button className="a11y-toggle" aria-label="Strumenti di accessibilità" aria-expanded={open} onClick={() => setOpen(!open)}>♿</button>
    </div>
  );
}
