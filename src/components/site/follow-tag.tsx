'use client';

import { useState, useTransition } from 'react';
import { followTagAction } from '@/lib/actions-engage';

export function FollowTag({ tagId, tagName, email }: { tagId: string; tagName: string; email: string }) {
  const [open, setOpen] = useState(false); const [mail, setMail] = useState(email); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  const go = () => start(async () => { const r = await followTagAction(tagId, mail); setMsg(r.message ?? ''); if (r.ok) setOpen(false); });
  if (msg && !open) return <span className="follow-tag done">✔ {msg}</span>;
  return <span className="follow-tag">{open ? <><input className="input" type="email" placeholder="La tua email" value={mail} onChange={(e) => setMail(e.target.value)} /><button className="btn btn-dark btn-sm" disabled={pending} onClick={go}>Segui</button>{msg && <span className="help">{msg}</span>}</> : <button type="button" className="btn btn-outline btn-sm" onClick={() => (email ? go() : setOpen(true))}>🔔 Segui «{tagName}»</button>}</span>;
}
