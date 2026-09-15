'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { previewDigestAction, removeSubscriberAction, sendDigestNowAction, sendPushNowAction, sendTestDigestAction } from '@/lib/actions-newsletter';
import type { NewsletterSend, Subscriber } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

interface Props { subscribers: Subscriber[]; sends: NewsletterSend[]; pushCount: number; mailConfigured: boolean; digest: { enabled: boolean; hour: number; provider: string }; canSend: boolean; myEmail: string }
const STATUS: Record<string, { label: string; cls: string }> = { confirmed: { label: 'Confermato', cls: 'badge-green' }, pending: { label: 'In attesa', cls: 'badge-gray' }, unsubscribed: { label: 'Disiscritto', cls: 'badge-red' } };

export function NewsletterAdmin({ subscribers, sends, pushCount, mailConfigured, digest, canSend, myEmail }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<string>('confirmed');
  const [subject, setSubject] = useState(''); const [testTo, setTestTo] = useState(myEmail);
  const [preview, setPreview] = useState<string | null>(null);
  const [push, setPush] = useState({ title: '', body: '', url: '/' });
  const confirmed = subscribers.filter((s) => s.status === 'confirmed');
  const shown = subscribers.filter((s) => filter === 'all' || (s.status ?? 'confirmed') === filter);
  const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent('email,stato,data\n' + confirmed.map((s) => `${s.email},${s.status},${s.createdAt}`).join('\n'));
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); });
  return (
    <>
      <div className="page-title"><div><h1>Newsletter e notifiche</h1><p>{confirmed.length} iscritti confermati · {subscribers.filter((s) => s.status === 'pending').length} in attesa di conferma · {pushCount} dispositivi con notifiche push</p></div><div className="actions"><a className="btn btn-outline" href={csv} download="iscritti.csv">Esporta CSV</a></div></div>
      {!mailConfigured && <div className="lock-banner">✉️ Il servizio email non è configurato: la rassegna del mattino e le conferme non possono partire. Vai in <Link href="/admin/impostazioni">Impostazioni → Newsletter ed email</Link> e inserisci la chiave di Resend o Brevo.</div>}
      <div className="admin-grid-2">
        <div>
          {canSend && (
            <div className="panel"><div className="panel-title">Rassegna del mattino {digest.enabled ? <span className="badge badge-green">automatica alle {digest.hour}:00</span> : <span className="badge badge-gray">invio automatico spento</span>}</div>
              <p className="help">La rassegna raccoglie le notizie delle ultime 24 ore (apertura in evidenza + le altre). Con l&apos;invio automatico parte ogni mattina all&apos;ora scelta nelle Impostazioni, a patto che il cron sia attivo.</p>
              <div className="field"><label>Oggetto personalizzato (vuoto = titolo dell&apos;apertura)</label><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="es. Buongiorno! Le notizie di oggi" /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => setPreview(await previewDigestAction()))}>Anteprima</button>
                <input className="input" style={{ maxWidth: 240 }} value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="email di prova" />
                <button className="btn btn-outline btn-sm" disabled={pending || !mailConfigured || !testTo} onClick={() => run(() => sendTestDigestAction(testTo))}>Invia prova</button>
                <button className="btn btn-primary btn-sm" disabled={pending || !mailConfigured || confirmed.length === 0} onClick={() => { if (confirm(`Inviare adesso la rassegna a ${confirmed.length} iscritti?`)) run(() => sendDigestNowAction(subject)); }}>Invia ora a tutti</button>
              </div>
              {preview && <div style={{ marginTop: 14, border: '1px solid var(--gray-200)', borderRadius: 6, overflow: 'hidden' }}><iframe title="Anteprima" srcDoc={preview} style={{ width: '100%', height: 520, border: 0 }} /></div>}
            </div>
          )}
          {canSend && (
            <div className="panel"><div className="panel-title">Notifica push manuale</div>
              <p className="help">Le ultim&apos;ora pubblicate con il flag &quot;Ultim&apos;ora&quot; partono da sole. Da qui puoi inviare un avviso libero a {pushCount} dispositivi.</p>
              <div className="form-row"><div className="field"><label>Titolo</label><input className="input" value={push.title} onChange={(e) => setPush({ ...push, title: e.target.value })} /></div><div className="field"><label>Link (percorso)</label><input className="input" value={push.url} onChange={(e) => setPush({ ...push, url: e.target.value })} placeholder="/categoria/slug" /></div></div>
              <div className="field"><label>Testo</label><input className="input" value={push.body} onChange={(e) => setPush({ ...push, body: e.target.value })} /></div>
              <button className="btn btn-dark btn-sm" disabled={pending || !push.title.trim() || pushCount === 0} onClick={() => run(() => sendPushNowAction(push))}>Invia notifica</button>
            </div>
          )}
          <div className="panel"><div className="panel-title">Invii recenti</div>
            <table className="table"><thead><tr><th>Quando</th><th>Oggetto</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Destinatari</th><th>Esito</th></tr></thead><tbody>
              {sends.map((s) => <tr key={s.id}><td style={{ whiteSpace: 'nowrap' }}>{formatDate(s.sentAt)}</td><td>{s.subject}</td><td>{s.kind === 'digest' ? 'automatico' : 'manuale'}</td><td style={{ textAlign: 'right' }}>{s.recipients}</td><td>{s.status === 'sent' ? <span className="badge badge-green">inviata</span> : <span className="badge badge-red" title={s.message}>fallita</span>}</td></tr>)}
              {sends.length === 0 && <tr><td colSpan={5} className="help">Nessun invio ancora.</td></tr>}
            </tbody></table>
          </div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Iscritti <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="confirmed">Confermati</option><option value="pending">In attesa</option><option value="unsubscribed">Disiscritti</option><option value="all">Tutti</option></select></div>
            <div className="table-wrap" style={{ border: 0, maxHeight: 620, overflow: 'auto' }}><table className="table">
              <thead><tr><th>Email</th><th>Stato</th><th>Dal</th><th></th></tr></thead>
              <tbody>
                {shown.slice(0, 500).map((s) => <tr key={s.id}><td><b>{s.email}</b><div className="t-sub">{s.source}</div></td><td><span className={`badge ${STATUS[s.status ?? 'confirmed']?.cls}`}>{STATUS[s.status ?? 'confirmed']?.label}</span></td><td style={{ color: 'var(--gray-600)' }}>{formatDate(s.createdAt, false)}</td><td><ActionButton className="icon-btn danger" confirm="Rimuovere questo iscritto?" action={() => removeSubscriberAction(s.id)}>🗑</ActionButton></td></tr>)}
                {shown.length === 0 && <tr><td colSpan={4} className="help">Nessun iscritto in questo elenco.</td></tr>}
              </tbody></table></div>
          </div>
        </div>
      </div>
    </>
  );
}
