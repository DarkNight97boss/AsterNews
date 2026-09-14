'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { loginAction } from '@/lib/actions';
import { ROLE_LABELS, Role } from '@/lib/models';

const DEMO_PASSWORD = 'aster2026';

export function LoginForm({ users, redirectTo }: { users: { email: string; role: Role }[]; redirectTo: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="login-page">
      <div className="login-card">
        <Link href="/" className="logo">Aster<span>news</span></Link>
        <p className="lead">Area riservata alla redazione</p>
        <form action={action}>
          <input type="hidden" name="redirect" value={redirectTo} />
          <div className="field"><label>Email</label><input className="input" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></div>
          <div className="field"><label>Password</label><input className="input" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
          {state && !state.ok && <p className="error-text">{state.message}</p>}
          <button className="btn btn-primary btn-lg" type="submit" style={{ width: '100%' }} disabled={pending}>{pending ? 'Accesso...' : 'Accedi'}</button>
        </form>
        <div className="demo-box">
          <b>Account demo</b> (password: <code>{DEMO_PASSWORD}</code>)
          <ul style={{ marginTop: 6 }}>
            {users.map((u) => (
              <li key={u.email}>{ROLE_LABELS[u.role]} · <button type="button" onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); }}>{u.email}</button></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
