'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createCircleInviteAction, revokeCircleInviteAction, saveCirclesAction, setReaderCirclesAction } from '@/lib/actions-circles';
import { toast } from '@/components/ui/toaster';

type Inv = { token: string; circleId: string; maxUses: number; uses: number; revoked: boolean; createdAt: string };
/** Cerchie: gruppi di lettori (famiglia, amici, sostenitori) a cui riservare post interi o singoli paragrafi, con chiavi d'invito revocabili. */
export function CirclesPanel({ circles, invites, members, base }: { circles: { id: string; name: string }[]; invites: Inv[]; members: { id: string; name: string; email: string; circles: string[] }[]; base: string }) {
  const router = useRouter(); const [names, setNames] = useState(circles.map((c) => c.name).join(', ')); const [link, setLink] = useState(''); const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; link?: string }>) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.link) setLink(r.link); router.refresh(); });
  return (
    <div className="panel"><div className="panel-title">Cerchie di lettori</div>
      <p className="help" style={{ marginBottom: 8 }}>Riserva un post intero o singoli paragrafi a gruppi scelti. Nell&apos;editor: blocco «Solo per una cerchia» oppure «Riservato a» nel pannello di pubblicazione.</p>
      <div style={{ display: 'flex', gap: 8 }}><input className="input" value={names} onChange={(e) => setNames(e.target.value)} placeholder="Famiglia, Amici, Sostenitori" /><button className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => saveCirclesAction(names.split(',')))}>Salva cerchie</button></div>
      {circles.length > 0 && <><div className="chips" style={{ margin: '10px 0' }}>{circles.map((c) => <button key={c.id} type="button" className="chip chip-btn" disabled={pending} onClick={() => run(() => createCircleInviteAction(c.id, 10))}>🔑 Crea chiave per «{c.name}» (10 usi)</button>)}</div>
        {link && <div className="lock-banner">Link d&apos;invito: <code style={{ userSelect: 'all' }}>{link}</code></div>}
        {invites.filter((i) => !i.revoked).length > 0 && <table className="table"><tbody>{invites.filter((i) => !i.revoked).map((i) => <tr key={i.token}><td>{circles.find((c) => c.id === i.circleId)?.name}</td><td><code style={{ fontSize: 11, userSelect: 'all' }}>{base}/account/invito?k={i.token}</code></td><td className="help">{i.uses}/{i.maxUses} usi</td><td><button className="btn btn-ghost btn-sm" onClick={() => run(() => revokeCircleInviteAction(i.token))}>Revoca</button></td></tr>)}</tbody></table>}
        {members.length > 0 && <><b style={{ fontSize: 13, display: 'block', margin: '10px 0 4px' }}>Chi è dentro</b><table className="table"><tbody>{members.map((m) => <tr key={m.id}><td><b>{m.name || m.email}</b><div className="t-sub">{m.email}</div></td><td><div className="chips">{circles.map((c) => <button key={c.id} type="button" className="chip chip-btn" style={m.circles.includes(c.id) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => run(() => setReaderCirclesAction(m.id, m.circles.includes(c.id) ? m.circles.filter((x) => x !== c.id) : [...m.circles, c.id]))}>{c.name}</button>)}</div></td></tr>)}</tbody></table></>}</>}
    </div>
  );
}
