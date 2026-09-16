'use client';

import { useEffect, useState } from 'react';
import type { LiveUpdate } from '@/lib/models';

const shortTime = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

/** Elenco degli aggiornamenti della diretta; se la diretta è attiva resta collegato via SSE e aggiunge le novità senza ricaricare. */
export function LiveFeed({ articleId, initial, active }: { articleId: string; initial: LiveUpdate[]; active: boolean }) {
  const [updates, setUpdates] = useState(initial); const [live, setLive] = useState(active); const [fresh, setFresh] = useState<string | null>(null);
  useEffect(() => {
    if (!active || typeof EventSource === 'undefined') return;
    const es = new EventSource(`/api/live/${articleId}`);
    es.addEventListener('update', (e) => { try { const d = JSON.parse((e as MessageEvent).data); setUpdates((prev) => { const newest = d.updates[0]?.id; if (newest && !prev.some((u) => u.id === newest)) { setFresh(newest); setTimeout(() => setFresh(null), 4000); } return d.updates; }); setLive(!!d.active); } catch { /* ignora */ } });
    es.addEventListener('end', () => { setLive(false); es.close(); });
    return () => es.close();
  }, [articleId, active]);
  if (!updates.length) return null;
  return (
    <section className="live-feed">
      <div className="live-head"><span className={`badge ${live ? 'badge-live' : 'badge-gray'}`}>{live ? 'Live' : 'Diretta conclusa'}</span> {live ? 'Aggiornamenti in tempo reale' : 'Com\'è andata'}</div>
      {updates.map((u) => <div key={u.id} className={`live-item ${fresh === u.id ? 'fresh' : ''}`}><time dateTime={u.time}>{shortTime(u.time)}</time><div><h4>{u.title}</h4><p>{u.body}</p></div></div>)}
    </section>
  );
}
