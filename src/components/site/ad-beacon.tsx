'use client';

import { useEffect } from 'react';

declare global { interface Window { adsbygoogle?: unknown[] } }
/** Conta l'impressione dell'annuncio (o inizializza AdSense per lo slot). */
export function AdBeacon({ id, adsense = false }: { id: string; adsense?: boolean }) {
  useEffect(() => {
    if (adsense) { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* script non ancora caricato */ } return; }
    if (!id) return;
    try { navigator.sendBeacon('/api/ad/i', new Blob([JSON.stringify({ id })], { type: 'application/json' })); } catch { /* ignore */ }
  }, [id, adsense]);
  return null;
}
