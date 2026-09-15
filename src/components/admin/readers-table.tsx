'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { adminUpdateReaderAction } from '@/lib/actions-readers';
import type { Reader } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

type Row = Reader & { createdAtLabel: string; lastLoginLabel: string };

export function ReadersTable({ readers }: { readers: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const patch = (id: string, p: { banned?: boolean; premium?: boolean; verified?: boolean }) => start(async () => { const r = await adminUpdateReaderAction(id, p); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); });
  return (
    <div className="table-wrap"><table className="table">
      <thead><tr><th>Lettore</th><th>Stato</th><th>Abbonamento</th><th>Registrato</th><th>Ultimo accesso</th><th></th></tr></thead>
      <tbody>
        {readers.map((r) => (
          <tr key={r.id} style={{ opacity: pending ? 0.6 : 1 }}>
            <td><b>{r.name || '—'}</b><div className="t-sub">{r.email}</div></td>
            <td>{r.banned ? <span className="badge badge-red">Sospeso</span> : r.verified ? <span className="badge badge-green">Verificato</span> : <span className="badge badge-gray">Da confermare</span>}</td>
            <td>{r.premium ? <span className="badge badge-green">Premium{r.premiumUntil ? ` → ${new Date(r.premiumUntil).toLocaleDateString('it-IT')}` : ''}</span> : <span className="badge badge-gray">Gratuito</span>}{r.stripeCustomer && <div className="t-sub">Stripe {r.stripeCustomer}</div>}</td>
            <td style={{ color: 'var(--gray-600)' }}>{r.createdAtLabel}</td><td style={{ color: 'var(--gray-600)' }}>{r.lastLoginLabel}</td>
            <td><div className="t-actions">
              {!r.verified && <button className="btn btn-outline btn-sm" onClick={() => patch(r.id, { verified: true })}>Conferma</button>}
              <button className="btn btn-outline btn-sm" onClick={() => patch(r.id, { premium: !r.premium })}>{r.premium ? 'Togli premium' : 'Regala premium'}</button>
              <button className={`btn btn-sm ${r.banned ? 'btn-outline' : 'btn-danger'}`} onClick={() => patch(r.id, { banned: !r.banned })}>{r.banned ? 'Riattiva' : 'Sospendi'}</button>
            </div></td>
          </tr>
        ))}
        {readers.length === 0 && <tr><td colSpan={6} className="help">Nessun lettore registrato.</td></tr>}
      </tbody></table></div>
  );
}
