'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { meterAction } from '@/lib/actions-readers';

/** Paywall soft: X articoli gratis al mese (cookie firmato), contenuti premium solo per abbonati. Il corpo viene mostrato sfumato se il limite è superato. */
export function Paywall({ articleId, premiumOnly, price, free, children }: { articleId: string; premiumOnly: boolean; price: number; free: number; children: ReactNode }) {
  const [state, setState] = useState<{ allowed: boolean; left: number; premiumRequired: boolean; registrationRequired?: boolean } | null>(premiumOnly ? { allowed: false, left: 0, premiumRequired: true } : null);
  useEffect(() => { if (!premiumOnly) meterAction(articleId).then(setState); }, [articleId, premiumOnly]);
  if (!state) return <div className="paywall"><div className="paywall-fade">{children}</div></div>;
  if (state.allowed) return <>{state.left <= 2 && <div className="meter-hint">Hai ancora {state.left} {state.left === 1 ? 'articolo gratuito' : 'articoli gratuiti'} questo mese. <Link href="/account">Abbonati</Link> per leggere senza limiti.</div>}{children}</>;
  return (
    <div className="paywall">
      <div className="paywall-fade" aria-hidden="true">{children}</div>
      <div className="paywall-box">
        <h3>{state.registrationRequired ? 'Registrati gratis per continuare a leggere' : state.premiumRequired ? 'Articolo riservato agli abbonati' : `Hai letto i ${free} articoli gratuiti del mese`}</h3>
        <p>{state.registrationRequired ? 'Bastano un\'email e pochi secondi: nessun costo, e potrai salvare gli articoli e commentare.' : `Sostieni il giornalismo locale: con ${price.toFixed(2).replace('.', ',')} € al mese leggi tutto, senza limiti, e disdici quando vuoi.`}</p>
        <div className="actions"><Link href={`/account?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`} className="btn btn-primary">Abbonati</Link><Link href={`/account?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`} className="btn btn-outline">Sei già abbonato? Accedi</Link></div>
      </div>
    </div>
  );
}
