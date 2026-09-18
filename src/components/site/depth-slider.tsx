'use client';

import { useEffect, useState } from 'react';

const LABELS = ['', 'In breve', 'Normale', 'Completo'];
/** Scrittura a strati: il lettore sceglie quanto approfondire; i paragrafi scritti in tre versioni cambiano insieme. La scelta resta per le prossime letture. */
export function DepthSlider({ minutes }: { minutes: [number, number, number] }) {
  const [d, setD] = useState(2);
  useEffect(() => { let v = 2; try { v = Number(localStorage.getItem('read_depth')) || 2; } catch { /* ignora */ } setD(v); document.documentElement.dataset.depth = String(v); return () => { delete document.documentElement.dataset.depth; }; }, []);
  const set = (v: number) => { setD(v); document.documentElement.dataset.depth = String(v); try { localStorage.setItem('read_depth', String(v)); } catch { /* ignora */ } };
  return <div className="depth-slider" role="group" aria-label="Quanto vuoi approfondire"><span className="ds-label">Quanto vuoi approfondire?</span><input type="range" min={1} max={3} step={1} value={d} onChange={(e) => set(Number(e.target.value))} aria-valuetext={LABELS[d]} /><span className="ds-value"><b>{LABELS[d]}</b> · {minutes[d - 1]} min</span></div>;
}
