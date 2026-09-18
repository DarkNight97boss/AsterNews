'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Slide { id: string; kicker: string; title: string; sub: string; image: string; breaking: boolean; qr: string }
/** Rotazione per gli schermi pubblici: una notizia ogni 14 secondi, orologio, meteo; ogni 5 minuti ricarica i dati senza lampeggiare. */
export function ScreenRotator({ siteName, place, slides, weather }: { siteName: string; place: string; slides: Slide[]; weather: string }) {
  const [i, setI] = useState(0); const [now, setNow] = useState(''); const router = useRouter();
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % Math.max(1, slides.length)), 14_000); return () => clearInterval(t); }, [slides.length]);
  useEffect(() => { const tick = () => setNow(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })); tick(); const c = setInterval(tick, 20_000); const r = setInterval(() => router.refresh(), 300_000); return () => { clearInterval(c); clearInterval(r); }; }, [router]);
  const s = slides[i % Math.max(1, slides.length)];
  return (
    <div className="screen" role="region" aria-label={`Notizie di ${siteName}`}>
      <div className="sc-top"><b>{siteName}</b><span>{place} {weather} · <span className="sc-clock">{now}</span></span></div>
      {s ? <div className="sc-slide" key={s.id} aria-live="off">{s.image && <img className="sc-bg" src={s.image} alt="" />}<div><p className={`sc-kicker${s.breaking ? ' breaking' : ''}`}>{s.kicker}</p><h1>{s.title}</h1><p className="sc-sub">{s.sub}</p></div><figure><img src={s.qr} alt="" />Inquadra per leggere</figure></div> : <div className="sc-slide"><div><h1>Nessuna notizia da mostrare</h1></div></div>}
      <div className="sc-bottom"><div className="sc-dots" aria-hidden="true">{slides.map((x, k) => <i key={x.id} className={k === i ? 'on' : ''} />)}</div><span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
    </div>
  );
}
