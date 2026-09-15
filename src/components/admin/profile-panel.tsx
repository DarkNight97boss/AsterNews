'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { beginTotpAction, changePasswordAction, confirmTotpAction, disableTotpAction, revokeOtherSessionsAction, revokeSessionAction, updateProfileAction } from '@/lib/actions-auth';
import { ROLE_LABELS, User } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

interface SessionRow { id: string; current: boolean; userAgent: string; ip: string; lastSeen: string; createdAt: string }
const device = (ua: string) => (/iphone|android/i.test(ua) ? '📱 Telefono' : /ipad|tablet/i.test(ua) ? '📱 Tablet' : '💻 Computer') + (/chrome/i.test(ua) && !/edg/i.test(ua) ? ' · Chrome' : /safari/i.test(ua) && !/chrome/i.test(ua) ? ' · Safari' : /firefox/i.test(ua) ? ' · Firefox' : /edg/i.test(ua) ? ' · Edge' : '');

export function ProfilePanel({ user, sessions, forceChange }: { user: User; sessions: SessionRow[]; forceChange: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [profile, setProfile] = useState({ name: user.name, bio: user.bio, longBio: user.longBio ?? '', title: user.title ?? '', avatar: user.avatar, socials: { x: '', instagram: '', facebook: '', linkedin: '', sito: '', ...(user.socials ?? {}) } });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [totp, setTotp] = useState<{ secret: string; qr: string; uri: string } | null>(null);
  const [code, setCode] = useState(''); const [disablePw, setDisablePw] = useState('');
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { after?.(); router.refresh(); } });
  return (
    <>
      <div className="page-title"><div><h1>Il mio profilo</h1><p>{user.email} · {ROLE_LABELS[user.role]}</p></div></div>
      {forceChange && <div className="panel" style={{ borderLeft: '4px solid var(--red)' }}><b>Devi scegliere una password personale</b><div className="help">Un amministratore ha impostato una password temporanea: cambiala ora.</div></div>}
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Password</div>
            {user.hasPassword && <div className="field"><label>Password attuale</label><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></div>}
            <div className="form-row"><div className="field"><label>Nuova password</label><input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></div><div className="field"><label>Ripeti</label><input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></div></div>
            <button className="btn btn-primary btn-sm" disabled={pending || pw.next.length < 10 || pw.next !== pw.confirm} onClick={() => run(() => changePasswordAction({ current: pw.current, next: pw.next }), () => setPw({ current: '', next: '', confirm: '' }))}>Aggiorna password</button>
            <div className="help" style={{ marginTop: 8 }}>Almeno 10 caratteri con lettere e almeno una maiuscola o una cifra. Cambiando password le altre sessioni vengono chiuse.</div>
          </div>
          <div className="panel"><div className="panel-title">Verifica in due passaggi {user.totpEnabled ? <span className="badge badge-green">Attiva</span> : <span className="badge badge-gray">Non attiva</span>}</div>
            {user.totpEnabled ? (
              <>
                <p className="help">A ogni accesso ti verrà chiesto il codice dell&apos;app di autenticazione (Google Authenticator, Authy, 1Password…).</p>
                <div className="form-row" style={{ alignItems: 'end' }}><div className="field"><label>Password per disattivare</label><input className="input" type="password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} /></div><div className="field"><button className="btn btn-danger btn-sm" disabled={pending || !disablePw} onClick={() => run(() => disableTotpAction(disablePw), () => setDisablePw(''))}>Disattiva</button></div></div>
              </>
            ) : totp ? (
              <>
                <div className="qr-box"><img src={totp.qr} alt="QR code" width={180} height={180} /><div><p className="help">1. Inquadra il QR con l&apos;app di autenticazione<br />oppure inserisci il codice: <code>{totp.secret}</code></p><p className="help" style={{ marginTop: 8 }}>2. Scrivi il codice a 6 cifre che vedi nell&apos;app</p><div style={{ display: 'flex', gap: 8, marginTop: 8 }}><input className="input" style={{ maxWidth: 140, letterSpacing: '.2em' }} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" /><button className="btn btn-primary btn-sm" disabled={pending || code.length < 6} onClick={() => run(() => confirmTotpAction(code), () => { setTotp(null); setCode(''); })}>Attiva</button></div></div></div>
              </>
            ) : (
              <><p className="help">Proteggi l&apos;account con un codice temporaneo generato dal telefono, oltre alla password. Consigliato per amministratori e caporedattori.</p><button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => setTotp(await beginTotpAction()))}>Configura con app di autenticazione</button></>
            )}
          </div>
          <div className="panel"><div className="panel-title">Sessioni attive <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => run(() => revokeOtherSessionsAction())}>Chiudi le altre</button></div>
            <ul className="sessions-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sessions.map((s) => <li key={s.id}><div className="grow"><b>{device(s.userAgent)}</b> {s.current && <span className="tag">questa sessione</span>}<div className="help">IP {s.ip || '—'} · ultimo accesso {formatDate(s.lastSeen)} · dal {formatDate(s.createdAt, false)}</div></div>{!s.current && <button className="icon-btn danger" title="Chiudi" onClick={() => run(() => revokeSessionAction(s.id))}>✕</button>}</li>)}
            </ul>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Dati pubblici (pagina autore)</div>
            <div className="form-row"><div className="field"><label>Nome e cognome</label><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div><div className="field"><label>Qualifica</label><input className="input" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })} placeholder="es. Inviato, Cronista giudiziaria" /></div></div>
            <div className="field"><label>Bio breve</label><textarea className="textarea" style={{ minHeight: 60 }} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} /></div>
            <div className="field"><label>Bio estesa (pagina autore)</label><textarea className="textarea" style={{ minHeight: 110 }} value={profile.longBio} onChange={(e) => setProfile({ ...profile, longBio: e.target.value })} /></div>
            <div className="field"><label>Avatar (URL)</label><input className="input" value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} /></div>
            <div className="form-row">{(['x', 'instagram', 'facebook', 'linkedin', 'sito'] as const).map((k) => <div key={k} className="field"><label>{k}</label><input className="input" value={profile.socials[k]} onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, [k]: e.target.value } })} placeholder="https://" /></div>)}</div>
            <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => updateProfileAction(profile))}>Salva profilo</button>
          </div>
        </div>
      </div>
    </>
  );
}
