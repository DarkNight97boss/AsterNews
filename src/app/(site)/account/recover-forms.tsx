'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { readerResetAction, readerResetRequestAction } from '@/lib/actions-readers';

export function ReaderRecoverForm() {
  const [state, action, pending] = useActionState(readerResetRequestAction, null);
  return (
    <div className="account"><div className="account-card">
      <h1>Recupera la password</h1>
      {state?.ok ? <p className="help" style={{ fontSize: 15 }}>{state.message}</p> : (
        <form action={action}>
          <div className="field"><label htmlFor="rc-email">Email</label><input id="rc-email" className="input" name="email" type="email" required /></div>
          {state && !state.ok && <p className="error-text">{state.message}</p>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={pending}>Invia il link</button>
        </form>
      )}
      <p className="help" style={{ marginTop: 12, textAlign: 'center' }}><Link href="/account">Torna all&apos;accesso</Link></p>
    </div></div>
  );
}
export function ReaderResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(readerResetAction, null);
  return (
    <div className="account"><div className="account-card">
      <h1>Nuova password</h1>
      {state?.ok ? <><p className="help" style={{ fontSize: 15 }}>{state.message}</p><Link href="/account" className="btn btn-primary">Accedi</Link></> : (
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <div className="field"><label htmlFor="rs-pw">Password (almeno 10 caratteri)</label><input id="rs-pw" className="input" name="password" type="password" minLength={10} required autoComplete="new-password" /></div>
          {state && !state.ok && <p className="error-text">{state.message}</p>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={pending}>Salva</button>
        </form>
      )}
    </div></div>
  );
}
