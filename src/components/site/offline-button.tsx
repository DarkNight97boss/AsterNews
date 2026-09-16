'use client';

import { useEffect, useState } from 'react';

/** Salva gli articoli scelti nella cache del browser (PWA) per leggerli senza connessione. */
export function OfflineButton({ urls }: { urls: string[] }) {
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'unsupported'>('idle'); const [have, setHave] = useState(0);
  useEffect(() => { if (!('caches' in window)) { setState('unsupported'); return; } caches.open('aster-offline').then(async (c) => { const keys = await c.keys(); setHave(keys.filter((k) => urls.includes(new URL(k.url).pathname)).length); }); }, [urls]);
  if (state === 'unsupported' || !urls.length) return null;
  return <button type="button" className="btn btn-outline btn-sm" disabled={state === 'saving'} onClick={async () => { setState('saving'); const c = await caches.open('aster-offline'); let n = 0; for (const u of urls) { try { await c.add(new Request(u, { cache: 'reload' })); n++; } catch { /* salta */ } } setHave(n); setState('done'); }}>{state === 'saving' ? 'Salvo…' : state === 'done' ? `✔ ${have} articoli disponibili offline` : have ? `📶 Aggiorna offline (${have} salvati)` : '📶 Rendi disponibili offline'}</button>;
}
