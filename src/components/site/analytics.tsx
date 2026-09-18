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
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    const metrics: Record<string, number> = {}; let cls = 0; let inp = 0;
    const obs: PerformanceObserver[] = [];
    const observe = (type: string, cb: (list: PerformanceObserverEntryList) => void) => { try { const o = new PerformanceObserver(cb); o.observe({ type, buffered: true } as PerformanceObserverInit); obs.push(o); } catch { /* non supportato */ } };
    observe('largest-contentful-paint', (l) => { const e = l.getEntries().pop(); if (e) metrics.LCP = e.startTime; });
    observe('layout-shift', (l) => { for (const e of l.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) if (!e.hadRecentInput) cls += e.value ?? 0; metrics.CLS = cls; });
    observe('event', (l) => { for (const e of l.getEntries() as (PerformanceEntry & { interactionId?: number })[]) if (e.interactionId && e.duration > inp) inp = e.duration; if (inp) metrics.INP = inp; });
    observe('paint', (l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') metrics.FCP = e.startTime; });
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined; if (nav) metrics.TTFB = nav.responseStart;
    const flush = () => { if (!Object.keys(metrics).length) return; const body = JSON.stringify({ path: location.pathname, device: window.innerWidth < 768 ? 'mobile' : 'desktop', metrics: Object.entries(metrics).map(([name, value]) => ({ name, value })) }); try { navigator.sendBeacon('/api/vitals', new Blob([body], { type: 'application/json' })); } catch { /* ignora */ } };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onHide); window.addEventListener('pagehide', flush);
    return () => { obs.forEach((o) => o.disconnect()); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', flush); };
  }, [pathname]);
  useEffect(() => { if (vercel && !document.getElementById('va-script')) { const s = document.createElement('script'); s.id = 'va-script'; s.src = '/_vercel/insights/script.js'; s.defer = true; document.body.appendChild(s); } }, [vercel]);
  return null;
}
