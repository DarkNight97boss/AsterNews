'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { verifyTwoFactorAction } from '@/lib/actions-auth';

export function TwoFactorForm() {
  const [state, action, pending] = useActionState(verifyTwoFactorAction, null);
  return (
    <div className="login-page">
      <div className="login-card">
        <Link href="/" className="logo">Aster<span>news</span></Link>
        <p className="lead">Inserisci il codice a 6 cifre generato dalla tua app di autenticazione.</p>
        <form action={action}>
          <div className="field"><label htmlFor="code">Codice</label><input id="code" className="input" name="code" inputMode="numeric" pattern="[0-9 ]*" autoComplete="one-time-code" autoFocus required style={{ fontSize: 24, letterSpacing: '.3em', textAlign: 'center' }} /></div>
          {state && !state.ok && <p className="error-text">{state.message}</p>}
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={pending}>{pending ? 'Verifica...' : 'Conferma'}</button>
        </form>
        <p className="help" style={{ marginTop: 14, textAlign: 'center' }}><Link href="/login">Torna all&apos;accesso</Link></p>
      </div>
    </div>
  );
}
