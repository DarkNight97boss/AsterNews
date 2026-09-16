'use client';

import { useEffect, useState } from 'react';
export function Countdown({ at, label }: { at: string; label: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => { const t = () => setLeft(new Date(at).getTime() - Date.now()); t(); const i = setInterval(t, 1000); return () => clearInterval(i); }, [at]);
  if (left === null) return null; if (left <= 0) return <div className="countdown"><b>{label || 'È il momento'}</b></div>;
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
  return <div className="countdown">{label && <span className="cd-label">{label}</span>}<div className="cd-nums">{[[d, 'giorni'], [h, 'ore'], [m, 'min'], [s, 'sec']].map(([n, l]) => <div key={String(l)}><b>{String(n).padStart(2, '0')}</b><span>{l}</span></div>)}</div></div>;
}
