'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveExtensionConfigAction, toggleExtensionAction } from '@/lib/actions-system';
import { toast } from '@/components/ui/toaster';

interface Field { key: string; label: string; type: 'text' | 'textarea' | 'url' | 'number' | 'select'; placeholder?: string; options?: string[]; help?: string }
interface Ext { id: string; name: string; description: string; version: string; author: string; fields: Field[]; hooks: string[] }

export function ExtensionsManager({ extensions, enabled, config }: { extensions: Ext[]; enabled: string[]; config: Record<string, Record<string, string>> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>(config);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); });
  return (
    <>
      <div className="page-title"><div><h1>Estensioni</h1><p>Funzioni aggiuntive che si agganciano al salvataggio, alla pubblicazione e al cron. {enabled.length} attive su {extensions.length}.</p></div></div>
      <div className="panel"><div className="panel-title">Come crearne una</div><p className="help">Ogni estensione è un file TypeScript in <code>src/extensions/</code> che esporta id, nome, campi di configurazione e hook (<code>beforeArticleSave</code>, <code>filterContent</code>, <code>afterArticlePublish</code>, <code>dailyJob</code>); si registra nell&apos;elenco di <code>src/extensions/index.ts</code>. La configurazione compilata qui viene passata agli hook.</p></div>
      <div className="ext-grid">
        {extensions.map((e) => { const on = enabled.includes(e.id); return (
          <div key={e.id} className={`panel ext-card ${on ? 'on' : ''}`}>
            <div className="panel-title">{e.name} <span className="help">v{e.version}</span></div>
            <p className="help">{e.description}</p>
            <div className="chips" style={{ margin: '8px 0' }}>{e.hooks.map((h) => <span key={h} className="chip">{h}</span>)}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${on ? 'btn-outline' : 'btn-primary'}`} disabled={pending} onClick={() => run(() => toggleExtensionAction(e.id, !on))}>{on ? 'Disattiva' : 'Attiva'}</button>
              {e.fields.length > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Chiudi' : 'Configura'}</button>}
            </div>
            {open === e.id && (
              <div style={{ marginTop: 12 }}>
                {e.fields.map((f) => <div key={f.key} className="field"><label>{f.label}</label>{f.type === 'textarea' ? <textarea className="textarea" style={{ minHeight: 80 }} placeholder={f.placeholder} value={draft[e.id]?.[f.key] ?? ''} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...(draft[e.id] ?? {}), [f.key]: ev.target.value } })} /> : f.type === 'select' ? <select className="select" value={draft[e.id]?.[f.key] ?? f.options?.[0] ?? ''} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...(draft[e.id] ?? {}), [f.key]: ev.target.value } })}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select> : <input className="input" type={f.type === 'number' ? 'number' : 'text'} placeholder={f.placeholder} value={draft[e.id]?.[f.key] ?? ''} onChange={(ev) => setDraft({ ...draft, [e.id]: { ...(draft[e.id] ?? {}), [f.key]: ev.target.value } })} />}{f.help && <div className="help">{f.help}</div>}</div>)}
                <button className="btn btn-dark btn-sm" disabled={pending} onClick={() => run(() => saveExtensionConfigAction(e.id, draft[e.id] ?? {}))}>Salva configurazione</button>
              </div>
            )}
          </div>
        ); })}
      </div>
    </>
  );
}
