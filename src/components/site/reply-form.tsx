'use client';
import { useState, useTransition } from 'react';
import { requestReplyAction } from '@/lib/actions-trust';

export function ReplyForm({ articleId }: { articleId: string }) {
  const [f, setF] = useState({ name: '', role: '', email: '', text: '' }); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [pending, start] = useTransition();
  if (msg?.ok) return <p className="reply-ask done" role="status">{msg.text}</p>;
  return (
    <details className="reply-ask"><summary>Sei citato in questo articolo? Chiedi il diritto di replica</summary>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await requestReplyAction(articleId, f); setMsg({ ok: r.ok, text: r.message ?? '' }); }); }}>
        <div className="form-row"><input className="input" required placeholder="Nome e cognome" aria-label="Nome e cognome" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input className="input" placeholder="Ruolo o ente (facoltativo)" aria-label="Ruolo o ente" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></div>
        <input className="input" type="email" required placeholder="Email (non viene pubblicata)" aria-label="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <textarea className="textarea" required minLength={40} maxLength={3000} placeholder="La tua replica. Se approvata, comparirà sotto l'articolo con il tuo nome." aria-label="Testo della replica" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
        {msg && !msg.ok && <p className="form-error" role="alert">{msg.text}</p>}
        <button className="btn btn-outline btn-sm" disabled={pending}>{pending ? 'Invio…' : 'Invia alla redazione'}</button>
      </form>
    </details>
  );
}
