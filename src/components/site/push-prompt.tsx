'use client';

import { useEffect, useState } from 'react';

const b64ToU8 = (s: string) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, (c) => c.charCodeAt(0)); };

/** Registra il service worker e, dopo qualche pagina vista, propone di attivare le notifiche per le ultim'ora. */
export function PushPrompt({ siteName }: { siteName: string }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    try {
      if (Notification.permission !== 'default' || localStorage.getItem('push_dismissed')) return;
      const n = Number(localStorage.getItem('pv') ?? 0) + 1; localStorage.setItem('pv', String(n));
      if (n >= 2) setTimeout(() => setShow(true), 4000);
    } catch { /* storage non disponibile */ }
  }, []);
  const enable = async () => {
    setBusy(true);
    try {
      const cfg = await fetch('/api/push/subscribe').then((r) => r.json());
      if (!cfg.enabled) { setShow(false); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setShow(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(cfg.publicKey) });
      await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) });
      setShow(false);
    } catch { setShow(false); } finally { setBusy(false); }
  };
  if (!show) return null;
  return (
    <div className="push-prompt" role="dialog" aria-label="Notifiche">
      <div><b>🔔 Ricevi le ultim&apos;ora</b><p>Attiva le notifiche di {siteName} per le notizie più importanti. Poche, solo quelle che contano.</p></div>
      <div className="push-actions"><button className="btn btn-primary btn-sm" onClick={enable} disabled={busy}>Attiva</button><button className="btn btn-ghost btn-sm" onClick={() => { setShow(false); try { localStorage.setItem('push_dismissed', '1'); } catch { /* ignore */ } }}>No, grazie</button></div>
    </div>
  );
}
