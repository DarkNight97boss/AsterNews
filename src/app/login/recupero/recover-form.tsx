'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordResetAction } from '@/lib/actions-auth';

export function RecoverForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);
  return (
    <div className="login-page">
      <div className="login-card">
        <Link href="/" className="logo">Aster<span>news</span></Link>
        <p className="lead">Inserisci la tua email: ti invieremo un link per scegliere una nuova password.</p>
        {state?.ok ? <p className="help" style={{ fontSize: 14 }}>{state.message}</p> : (
          <form action={action}>
            <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" name="email" required autoComplete="username" /></div>
            {state && !state.ok && <p className="error-text">{state.message}</p>}
            <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={pending}>{pending ? 'Invio...' : 'Invia il link'}</button>
          </form>
        )}
        <p className="help" style={{ marginTop: 14, textAlign: 'center' }}><Link href="/login">Torna all&apos;accesso</Link></p>
      </div>
    </div>
  );
}
