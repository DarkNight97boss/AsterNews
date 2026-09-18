'use client';

import { useState, useTransition } from 'react';
import { sendWinbackAction } from '@/lib/actions-revenue';
import { toast } from '@/components/ui/toaster';

export function ChurnPanel({ risk }: { risk: { id: string; email: string; name: string; lastLogin: string | null; premiumUntil: string | null }[] }) {
  const [sel, setSel] = useState<string[]>(risk.map((r) => r.id)); const [pending, start] = useTransition();
  if (!risk.length) return null;
  return (
    <div className="panel"><div className="panel-title">Abbonati a rischio di abbandono ({risk.length}) <button className="btn btn-outline btn-sm" disabled={pending || !sel.length} onClick={() => start(async () => { const r = await sendWinbackAction(sel); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Invia email di recupero a {sel.length}</button></div>
      <p className="help" style={{ marginBottom: 8 }}>Pagano ma non accedono da almeno tre settimane: è il segnale che precede la disdetta.</p>
      <table className="table"><tbody>{risk.slice(0, 30).map((r) => <tr key={r.id}><td style={{ width: 30 }}><input type="checkbox" checked={sel.includes(r.id)} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : [...sel, r.id])} /></td><td><b>{r.name || r.email}</b><div className="t-sub">{r.email}</div></td><td className="help">ultimo accesso: {r.lastLogin ? new Date(r.lastLogin).toLocaleDateString('it-IT') : 'mai'}</td><td className="help">{r.premiumUntil ? `rinnovo ${new Date(r.premiumUntil).toLocaleDateString('it-IT')}` : ''}</td></tr>)}</tbody></table>
    </div>
  );
}
