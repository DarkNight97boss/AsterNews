'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Statistiche integrate: una pagina vista al caricamento e il tempo di lettura all'uscita (sendBeacon). Nessun cookie, nessun tracciamento tra siti. */
export function Analytics({ articleId = '', vercel = false }: { articleId?: string; vercel?: boolean }) {
  const pathname = usePathname();
  const start = useRef(Date.now());
  useEffect(() => {
    start.current = Date.now();
    const internal = document.referrer.startsWith(location.origin);
    const send = (body: object) => { try { navigator.sendBeacon('/api/hit', new Blob([JSON.stringify(body)], { type: 'application/json' })); } catch { fetch('/api/hit', { method: 'POST', body: JSON.stringify(body), keepalive: true }).catch(() => {}); } };
    send({ path: location.pathname + location.search, articleId, ref: document.referrer, internal });
    const leave = () => { const ms = Date.now() - start.current; if (ms > 2000) send({ path: location.pathname, articleId, readMs: ms, internal: true }); };
    window.addEventListener('pagehide', leave);
    return () => { window.removeEventListener('pagehide', leave); leave(); };
  }, [pathname, articleId]);
  useEffect(() => { if (vercel && !document.getElementById('va-script')) { const s = document.createElement('script'); s.id = 'va-script'; s.src = '/_vercel/insights/script.js'; s.defer = true; document.body.appendChild(s); } }, [vercel]);
  return null;
}
