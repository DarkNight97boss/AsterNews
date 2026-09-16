'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createApiKeyAction, deleteApiKeyAction, saveApiSettingsAction, toggleApiKeyAction } from '@/lib/actions-system';
import type { ApiKey, ApiSettings } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

export function ApiKeysManager({ keys, settings, base }: { keys: ApiKey[]; settings: ApiSettings; base: string }) {
  const router = useRouter(); const [name, setName] = useState(''); const [created, setCreated] = useState(''); const [pending, start] = useTransition(); const [cfg, setCfg] = useState(settings);
  return (
    <>
      <div className="page-title"><div><h1>API pubblica</h1><p>{settings.enabled ? 'Attiva' : 'Disattivata'} · {settings.requireKey ? 'chiave obbligatoria' : 'lettura libera, chiave facoltativa'} · limite {settings.rateLimitPerMinute} richieste al minuto per chiave o IP.</p></div></div>
      <div className="panel"><div className="panel-title">Impostazioni</div><div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}><label className="switch"><input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} /> API attiva</label><label className="switch"><input type="checkbox" checked={cfg.requireKey} onChange={(e) => setCfg({ ...cfg, requireKey: e.target.checked })} /> Chiave obbligatoria</label><label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>Richieste al minuto <input className="input" type="number" style={{ width: 90 }} value={cfg.rateLimitPerMinute} onChange={(e) => setCfg({ ...cfg, rateLimitPerMinute: Number(e.target.value) })} /></label><button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await saveApiSettingsAction(cfg); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva</button></div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Nuova chiave</div>
            <div style={{ display: 'flex', gap: 8 }}><input className="input" placeholder="es. App mobile, Sito partner" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-primary" disabled={pending || !name.trim()} onClick={() => start(async () => { const r = await createApiKeyAction(name); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.key) { setCreated(r.key); setName(''); router.refresh(); } })}>Crea</button></div>
            {created && <div className="lock-banner" style={{ marginTop: 10 }}>Chiave (copiala ora): <code style={{ userSelect: 'all' }}>{created}</code></div>}
          </div>
          <div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>Prefisso</th><th style={{ textAlign: 'right' }}>Chiamate</th><th>Ultimo uso</th><th>Stato</th><th></th></tr></thead><tbody>
            {keys.map((k) => <tr key={k.id}><td><b>{k.name}</b><div className="t-sub">creata {formatDate(k.createdAt, false)}</div></td><td><code>{k.prefix}…</code></td><td style={{ textAlign: 'right' }}>{k.calls}</td><td className="help">{k.lastUsed ? formatDate(k.lastUsed) : '—'}</td><td>{k.active ? <span className="badge badge-green">attiva</span> : <span className="badge badge-gray">sospesa</span>}</td><td><div className="t-actions"><ActionButton className="btn btn-outline btn-sm" action={() => toggleApiKeyAction(k.id, !k.active)}>{k.active ? 'Sospendi' : 'Riattiva'}</ActionButton><ActionButton className="icon-btn danger" confirm="Eliminare la chiave?" action={() => deleteApiKeyAction(k.id)}>🗑</ActionButton></div></td></tr>)}
            {keys.length === 0 && <tr><td colSpan={6} className="help">Nessuna chiave.</td></tr>}
          </tbody></table></div>
        </div>
        <div className="panel"><div className="panel-title">Documentazione</div>
          <p className="help">Risposte JSON, sola lettura, CORS aperto. Intestazione <code>Authorization: Bearer &lt;chiave&gt;</code> oppure <code>?key=</code>.</p>
          <ul className="activity">
            {['/api/v1/site', '/api/v1/articles?limit=20&offset=0&category=politica&zone=&tag=&featured=1', '/api/v1/articles/{slug}', '/api/v1/search?q=manovra', '/api/v1/categories', '/api/v1/tags', '/api/v1/zones', '/api/v1/events'].map((e) => <li key={e}><span>→</span><div><code>{base}{e}</code></div></li>)}
          </ul>
          <p className="help">Per ricevere eventi in tempo reale (nuovo articolo) usa l&apos;estensione «Webhook alla pubblicazione».</p>
        </div>
      </div>
    </>
  );
}
