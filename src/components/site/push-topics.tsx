'use client';

import { useEffect, useState } from 'react';

type Opt = { id: string; name: string };
const b64 = (s: string) => { const pad = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };
/** Scelta degli argomenti per le notifiche push di questo dispositivo (zone e categorie). */
export function PushTopics({ publicKey, categories, zones }: { publicKey: string; categories: Opt[]; zones: Opt[] }) {
  const [topics, setTopics] = useState<string[]>([]); const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'denied' | 'unsupported'>('idle');
  useEffect(() => { if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setState('unsupported'); return; } try { setTopics(JSON.parse(localStorage.getItem('push_topics') ?? '[]')); } catch { /* ignora */ } }, []);
  const toggle = (t: string) => setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  const save = async () => {
    setState('saving');
    try { const perm = await Notification.requestPermission(); if (perm !== 'granted') { setState('denied'); return; } const reg = await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready; const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) })); const j = sub.toJSON(); await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, topics }) }); localStorage.setItem('push_topics', JSON.stringify(topics)); setState('saved'); } catch { setState('denied'); }
  };
  if (state === 'unsupported') return <p className="notice">Questo browser non supporta le notifiche. Su iPhone: aggiungi prima il sito alla schermata Home.</p>;
  const Group = ({ title, prefix, items }: { title: string; prefix: string; items: Opt[] }) => <div className="widget"><h4 className="widget-title">{title}</h4><div className="chips">{items.map((i) => <button key={i.id} type="button" className="chip" style={topics.includes(`${prefix}:${i.id}`) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => toggle(`${prefix}:${i.id}`)}>{i.name}</button>)}</div></div>;
  return <div className="prefs-form"><Group title="Sezioni" prefix="cat" items={categories} /><Group title="Zone" prefix="zone" items={zones} /><button className="btn btn-primary" disabled={state === 'saving'} onClick={save}>{state === 'saving' ? 'Salvo…' : topics.length ? `Attiva per ${topics.length} argomenti` : 'Attiva solo le ultim\'ora'}</button>{state === 'saved' && <p className="notice ok">Fatto: riceverai le notifiche scelte su questo dispositivo.</p>}{state === 'denied' && <p className="notice">Permesso negato: abilita le notifiche per questo sito dalle impostazioni del browser.</p>}</div>;
}
