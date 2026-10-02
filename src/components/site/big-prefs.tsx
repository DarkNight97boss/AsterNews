'use client';
import { useEffect, useState, useTransition } from 'react';
import { saveA11yAction } from '@/lib/actions-school';

type Prefs = { font: 'normal' | 'large' | 'xlarge'; contrast: 'normal' | 'high'; motion: 'normal' | 'reduce' };
const apply = (p: Prefs) => { const h = document.documentElement; h.dataset.a11yFont = p.font; h.dataset.a11yContrast = p.contrast; h.dataset.a11yMotion = p.motion; try { localStorage.setItem('a11y', JSON.stringify(p)); } catch { /* */ } };
/** Scelta una volta, con pulsanti grandi: carattere, contrasto, animazioni. Con l'account la scelta segue la persona ovunque. */
export function BigPrefs({ logged, initial }: { logged: boolean; initial?: Prefs }) {
  const [p, setP] = useState<Prefs>(initial ?? { font: 'normal', contrast: 'normal', motion: 'normal' }); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  useEffect(() => { if (initial) { apply(initial); return; } try { const saved = JSON.parse(localStorage.getItem('a11y') ?? 'null'); if (saved) setP(saved); } catch { /* */ } }, [initial]);
  const set = (patch: Partial<Prefs>) => { const n = { ...p, ...patch }; setP(n); apply(n); if (logged) start(async () => { const r = await saveA11yAction(n); setMsg(r.message ?? ''); }); else setMsg('Scelta salvata su questo dispositivo. Con l\'account vale ovunque.'); };
  const Big = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => <button type="button" className={`big-btn${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>{label}</button>;
  return <div className="big-prefs"><h2>Quanto grande vuoi il testo?</h2><div className="big-row"><Big on={p.font === 'normal'} label="Normale" onClick={() => set({ font: 'normal' })} /><Big on={p.font === 'large'} label="Grande" onClick={() => set({ font: 'large' })} /><Big on={p.font === 'xlarge'} label="Molto grande" onClick={() => set({ font: 'xlarge' })} /></div><h2>Contrasto</h2><div className="big-row"><Big on={p.contrast === 'normal'} label="Normale" onClick={() => set({ contrast: 'normal' })} /><Big on={p.contrast === 'high'} label="Alto contrasto" onClick={() => set({ contrast: 'high' })} /></div><h2>Movimento</h2><div className="big-row"><Big on={p.motion === 'normal'} label="Normale" onClick={() => set({ motion: 'normal' })} /><Big on={p.motion === 'reduce'} label="Meno animazioni" onClick={() => set({ motion: 'reduce' })} /></div>{msg && <p role="status" className="big-msg">{pending ? 'Salvo…' : msg}</p>}</div>;
}
