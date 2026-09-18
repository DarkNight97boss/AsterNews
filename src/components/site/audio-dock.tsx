'use client';

import { useEffect, useRef, useState } from 'react';

type Track = { title: string; url: string; src: string };
/** Coda di ascolto con player che resta in basso mentre si naviga (il layout non si smonta nei cambi pagina). */
export function AudioDock() {
  const [queue, setQueue] = useState<Track[]>([]); const [playing, setPlaying] = useState(false); const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => { try { setQueue(JSON.parse(localStorage.getItem('audio_queue') ?? '[]')); } catch { /* ignora */ } const add = (e: Event) => { const t = (e as CustomEvent<Track>).detail; setQueue((q) => (q.some((x) => x.src === t.src) ? q : [...q, t])); }; window.addEventListener('aster:queue', add); return () => window.removeEventListener('aster:queue', add); }, []);
  useEffect(() => { try { localStorage.setItem('audio_queue', JSON.stringify(queue)); } catch { /* ignora */ } }, [queue]);
  if (!queue.length) return null; const cur = queue[0];
  return (
    <div className="audio-dock" role="region" aria-label="Coda di ascolto">
      <div className="ad-info"><span>🎧 {queue.length > 1 ? `1 di ${queue.length}` : 'In ascolto'}</span><a href={cur.url}>{cur.title}</a></div>
      <audio ref={audio} src={cur.src} controls preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setQueue((q) => q.slice(1)); setTimeout(() => audio.current?.play().catch(() => {}), 300); }} />
      {queue.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQueue((q) => q.slice(1))} title="Prossimo">⏭</button>}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { audio.current?.pause(); setQueue([]); }} title={playing ? 'Ferma e svuota' : 'Svuota la coda'}>✕</button>
    </div>
  );
}
