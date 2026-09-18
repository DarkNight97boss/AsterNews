'use client';

import { useState, useTransition } from 'react';
import { acceptCircleInviteAction } from '@/lib/actions-circles';
export function AcceptInvite({ token }: { token: string }) { const [msg, setMsg] = useState(''); const [ok, setOk] = useState(false); const [pending, start] = useTransition(); return ok ? <p className="notice ok">{msg} <a href="/">Vai al sito →</a></p> : <><p>Entrando vedrai i contenuti che l&apos;autore riserva a questa cerchia.</p><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await acceptCircleInviteAction(token); setMsg(r.message ?? ''); setOk(r.ok); })}>Entra nella cerchia</button>{msg && !ok && <p className="error-text">{msg}</p>}</>; }
