'use client';

import { useState, useTransition } from 'react';
import { checkInTicketAction } from '@/lib/actions-engage';

export function TicketCheckin() {
  const [code, setCode] = useState(''); const [res, setRes] = useState<{ ok: boolean; message?: string } | null>(null); const [pending, start] = useTransition();
  return <div className="panel"><div className="panel-title">Controllo all&apos;ingresso</div><form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); start(async () => { setRes(await checkInTicketAction(code)); setCode(''); }); }}><input className="input" placeholder="TKT-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value)} autoFocus /><button className="btn btn-primary" disabled={pending || !code}>Verifica</button></form>{res && <p className={res.ok ? 'notice ok' : 'error-text'} style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{res.ok ? '✅' : '❌'} {res.message}</p>}</div>;
}
