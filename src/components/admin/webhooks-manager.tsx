'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveWebhooksAction, testWebhookAction } from '@/lib/actions-channels';
import type { WebhookConfig } from '@/lib/models';
import { toast } from '@/components/ui/toaster';

const EVENTS = [['article.published', 'Articolo pubblicato'], ['article.updated', 'Articolo aggiornato'], ['comment.created', 'Nuovo commento'], ['subscriber.created', 'Iscritto newsletter'], ['reader.registered', 'Lettore registrato'], ['donation.paid', 'Donazione'], ['event.created', 'Evento proposto']];
/** Webhook in uscita (Zapier, Make, n8n, Slack): eventi scelti, segreto HMAC, prova immediata. */
export function WebhooksManager({ initial }: { initial: WebhookConfig[] }) {
  const router = useRouter(); const [hooks, setHooks] = useState(initial); const [pending, start] = useTransition();
  const upd = (i: number, p: Partial<WebhookConfig>) => setHooks(hooks.map((h, j) => (j === i ? { ...h, ...p } : h)));
  return (
    <div className="panel"><div className="panel-title">Webhook in uscita <button className="btn btn-outline btn-sm" onClick={() => setHooks([...hooks, { id: '', url: '', secret: '', events: ['article.published'], enabled: true }])}>+ Webhook</button></div>
      <p className="help" style={{ marginBottom: 10 }}>Ogni evento invia un POST JSON con intestazione <code>X-Aster-Event</code> e firma <code>X-Aster-Signature: sha256=…</code> (HMAC del corpo con il segreto). Funziona con Zapier, Make, n8n, Slack (Incoming Webhook) e qualsiasi backend.</p>
      {hooks.map((h, i) => <div key={i} className="rule-card">
        <div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="https://hooks.zapier.com/…" value={h.url} onChange={(e) => upd(i, { url: e.target.value })} /><input className="input" style={{ maxWidth: 200 }} placeholder="Segreto (facoltativo)" value={h.secret} onChange={(e) => upd(i, { secret: e.target.value })} /><label className="switch"><input type="checkbox" checked={h.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} /> attivo</label><button className="btn btn-ghost btn-sm" disabled={pending || !h.url} onClick={() => start(async () => { const r = await testWebhookAction(h.url, h.secret); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Prova</button><button className="icon-btn danger" onClick={() => setHooks(hooks.filter((_, j) => j !== i))}>✕</button></div>
        <div className="chips" style={{ marginTop: 6 }}>{EVENTS.map(([id, label]) => <label key={id} className="chip"><input type="checkbox" checked={h.events.includes(id)} onChange={(e) => upd(i, { events: e.target.checked ? [...h.events, id] : h.events.filter((x) => x !== id) })} /> {label}</label>)}</div>
      </div>)}
      <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveWebhooksAction(hooks); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva webhook</button>
    </div>
  );
}
