'use client';

import Link from 'next/link';
import { useState } from 'react';
import { setCookieConsentAction } from '@/lib/actions';

export function CookieBanner() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const choose = (v: 'all' | 'necessary') => { setHidden(true); setCookieConsentAction(v); };
  return (
    <div className="cookie-banner" role="dialog" aria-label="Informativa cookie">
      <div>
        <b>Informativa privacy</b>
        <p>Questo sito utilizza cookie tecnici e, previo consenso, cookie di misurazione per migliorare il servizio. Puoi accettare tutti i cookie o continuare con i soli cookie necessari. <Link href="/#privacy">Cookie policy</Link></p>
      </div>
      <div className="cookie-actions">
        <button className="btn btn-outline btn-sm" onClick={() => choose('necessary')}>Continua senza accettare</button>
        <button className="btn btn-blue btn-sm" onClick={() => choose('all')}>Accetta</button>
      </div>
    </div>
  );
}
