'use client';
import { useState, useTransition } from 'react';
import { findSpotAction } from '@/lib/actions-reading';

export function ResumeForm() {
  const [code, setCode] = useState(''); const [err, setErr] = useState(''); const [pending, start] = useTransition();
  return <form className="resume-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await findSpotAction(code); if (r.ok && r.url) location.href = r.url; else setErr(r.message ?? 'Errore'); }); }}><label htmlFor="spot-code">Le tue tre parole</label><input id="spot-code" className="input" autoComplete="off" autoCapitalize="none" placeholder="es. mare-sole-luna" value={code} onChange={(e) => setCode(e.target.value)} />{err && <p className="form-error" role="alert">{err}</p>}<button className="btn btn-primary" disabled={pending || code.trim().length < 5}>{pending ? 'Cerco…' : 'Riprendi la lettura'}</button></form>;
}
