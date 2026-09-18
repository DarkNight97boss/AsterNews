'use client';
import { useEffect, useState } from 'react';
import { resolveBoardAction } from '@/lib/actions-commons';
export function BoardResolve({ id, token }: { id: string; token: string }) { const [msg, setMsg] = useState(''); useEffect(() => { resolveBoardAction(id, token).then((r) => setMsg(r.message ?? '')); }, [id, token]); return msg ? <p className="contrib-done" role="status">{msg}</p> : null; }
