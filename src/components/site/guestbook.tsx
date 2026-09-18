'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { signGuestbookAction } from '@/lib/actions-personal';
import { subscribeAction } from '@/lib/actions';

export function SilenceSubscribe() {
  const [email, setEmail] = useState(''); const [msg, setMsg] = useState(''); const [pending, start] = useTransition();
  if (msg) return <span role="status">{msg}</span>;
  return <form className="silence-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await subscribeAction(email); setMsg(r.ok ? 'Ti scrivo quando torno.' : r.message ?? 'Errore'); }); }}><input type="email" required aria-label="Email per essere avvisato al ritorno" placeholder="Avvisami al ritorno: la tua email" value={email} onChange={(e) => setEmail(e.target.value)} /><button disabled={pending}>Ok</button></form>;
}
/** Libro degli ospiti scritto a mano: un riquadro su cui si scrive col dito o col mouse. */
export function GuestbookPad() {
  const ref = useRef<HTMLCanvasElement>(null); const drawing = useRef(false); const [name, setName] = useState(''); const [dirty, setDirty] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  useEffect(() => { const c = ref.current; if (!c) return; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, c.width, c.height); ctx.strokeStyle = '#1a2a6c'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }, []);
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => { const c = ref.current!; const r = c.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }; };
  const clear = () => { const c = ref.current!; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, c.width, c.height); setDirty(false); };
  if (msg?.ok) return <p className="reply-ask done" role="status">{msg.text}</p>;
  return (
    <div className="guestpad"><canvas ref={ref} width={640} height={260} aria-label="Riquadro per scrivere a mano il tuo messaggio" onPointerDown={(e) => { drawing.current = true; e.currentTarget.setPointerCapture(e.pointerId); const p = pos(e); const ctx = ref.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(p.x, p.y); }} onPointerMove={(e) => { if (!drawing.current) return; const p = pos(e); const ctx = ref.current!.getContext('2d')!; ctx.lineTo(p.x, p.y); ctx.stroke(); setDirty(true); }} onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }} />
      <div className="guestpad-row"><input className="input" placeholder="Il tuo nome (facoltativo)" aria-label="Il tuo nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /><button type="button" className="btn btn-ghost btn-sm" onClick={clear}>Cancella</button><button type="button" className="btn btn-primary btn-sm" disabled={pending || !dirty} onClick={() => start(async () => { const r = await signGuestbookAction(name, ref.current!.toDataURL('image/png')); setMsg({ ok: r.ok, text: r.message ?? '' }); })}>{pending ? 'Invio…' : 'Lascia il messaggio'}</button></div>
      {msg && !msg.ok && <p className="form-error" role="alert">{msg.text}</p>}
    </div>
  );
}
