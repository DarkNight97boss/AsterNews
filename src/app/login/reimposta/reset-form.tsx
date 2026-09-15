'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { resetPasswordAction } from '@/lib/actions-auth';

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <div className="login-page">
      <div className="login-card">
        <Link href="/" className="logo">Aster<span>news</span></Link>
        <p className="lead">Scegli una nuova password (almeno 10 caratteri, con lettere e almeno una maiuscola o cifra).</p>
        {state?.ok ? <><p className="help" style={{ fontSize: 14 }}>{state.message}</p><Link href="/login" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12, textAlign: 'center' }}>Vai all&apos;accesso</Link></> : (
          <form action={action}>
            <input type="hidden" name="token" value={token} />
            <div className="field"><label htmlFor="pw">Nuova password</label><input id="pw" className="input" type="password" name="password" required autoComplete="new-password" minLength={10} /></div>
            {state && !state.ok && <p className="error-text">{state.message}</p>}
            <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={pending}>{pending ? 'Salvataggio...' : 'Salva la password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
