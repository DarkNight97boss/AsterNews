'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { customerPortalAction, loginReaderAction, logoutReaderAction, registerReaderAction, startCheckoutAction, updateReaderAction } from '@/lib/actions-readers';
import type { Reader } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

interface Props { reader: Reader | null; paywall: { enabled: boolean; price: number; free: number }; siteName: string; notice: string; redirectTo: string }

export function AccountPanel({ reader, paywall, siteName, notice, redirectTo }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [state, loginAction, loginPending] = useActionState(loginReaderAction, null);
  const [reg, setReg] = useState({ name: '', email: '', password: '', newsletter: true });
  const [regMsg, setRegMsg] = useState<{ ok: boolean; message?: string } | null>(null);
  const [name, setName] = useState(reader?.name ?? '');
  const [pending, start] = useTransition();
  if (!reader) {
    return (
      <div className="account">
        <div className="account-card">
          <h1>{mode === 'login' ? 'Accedi' : 'Crea il tuo account'}</h1>
          <p className="lead">Con un account {siteName} puoi commentare, salvare le preferenze e {paywall.enabled ? 'abbonarti ai contenuti premium.' : 'ricevere la newsletter.'}</p>
          <div className="tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Accedi</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Registrati</button></div>
          {mode === 'login' ? (
            <form action={loginAction}>
              <input type="hidden" name="redirect" value={redirectTo} />
              <div className="field"><label htmlFor="r-email">Email</label><input id="r-email" className="input" name="email" type="email" required autoComplete="username" /></div>
              <div className="field"><label htmlFor="r-pw">Password</label><input id="r-pw" className="input" name="password" type="password" required autoComplete="current-password" /></div>
              {state && !state.ok && <p className="error-text">{state.message}</p>}
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loginPending}>{loginPending ? 'Accesso…' : 'Accedi'}</button>
              <p className="help" style={{ marginTop: 10, textAlign: 'center' }}><Link href="/account/recupero">Password dimenticata?</Link></p>
            </form>
          ) : regMsg?.ok ? <p className="help" style={{ fontSize: 15 }}>{regMsg.message}</p> : (
            <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await registerReaderAction(reg); setRegMsg(r); if (r.ok) router.refresh(); }); }}>
              <div className="field"><label htmlFor="g-name">Nome</label><input id="g-name" className="input" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} required /></div>
              <div className="field"><label htmlFor="g-email">Email</label><input id="g-email" className="input" type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} required autoComplete="username" /></div>
              <div className="field"><label htmlFor="g-pw">Password (almeno 10 caratteri)</label><input id="g-pw" className="input" type="password" value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} required minLength={10} autoComplete="new-password" /></div>
              <label className="checkbox"><input type="checkbox" checked={reg.newsletter} onChange={(e) => setReg({ ...reg, newsletter: e.target.checked })} /> Iscrivimi alla newsletter del mattino</label>
              {regMsg && !regMsg.ok && <p className="error-text">{regMsg.message}</p>}
              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 12 }} disabled={pending}>{pending ? 'Creazione…' : 'Crea account'}</button>
              <p className="help" style={{ marginTop: 10 }}>Registrandoti accetti l&apos;informativa privacy. Nessuna pubblicità profilata.</p>
            </form>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="account">
      <div className="account-card">
        <h1>Ciao {reader.name || reader.email}</h1>
        {notice === 'ok' && <p className="notice ok">Abbonamento attivato, grazie! Se non vedi subito i contenuti premium ricarica la pagina tra qualche secondo.</p>}
        {notice === 'annullato' && <p className="notice">Pagamento annullato: puoi riprovare quando vuoi.</p>}
        <div className="account-row"><b>Email</b><span>{reader.email}{reader.verified ? ' ✓' : ' (da confermare)'}</span></div>
        <div className="account-row"><b>Abbonamento</b><span>{reader.premium ? `Premium attivo${reader.premiumUntil ? ` fino al ${new Date(reader.premiumUntil).toLocaleDateString('it-IT')}` : ''}` : 'Nessuno'}</span></div>
        {paywall.enabled && !reader.premium && <div className="premium-box"><b>Passa a Premium · {paywall.price.toFixed(2).replace('.', ',')} € al mese</b><p>Accesso illimitato a tutti gli articoli, anche quelli riservati, senza limite di {paywall.free} letture al mese. Disdici quando vuoi.</p><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await startCheckoutAction(); if (r.ok && r.url) location.href = r.url; else toast.error(r.message ?? 'Errore'); })}>Abbonati ora</button></div>}
        {reader.premium && reader.stripeCustomer && <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await customerPortalAction(); if (r.ok && r.url) location.href = r.url; else toast.error(r.message ?? 'Errore'); })}>Gestisci abbonamento e fatture</button>}
        <div className="field" style={{ marginTop: 20 }}><label htmlFor="a-name">Nome mostrato nei commenti</label><div style={{ display: 'flex', gap: 8 }}><input id="a-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-outline" disabled={pending} onClick={() => start(async () => { const r = await updateReaderAction({ name }); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva</button></div></div>
        <form action={logoutReaderAction} style={{ marginTop: 20 }}><button className="btn btn-ghost">Esci</button></form>
      </div>
    </div>
  );
}
