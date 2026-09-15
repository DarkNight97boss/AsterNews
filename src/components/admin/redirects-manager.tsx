'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clearNotFoundAction, deleteNotFoundAction, deleteRedirectAction, importRedirectsAction, saveRedirectAction, suggestRedirectAction } from '@/lib/actions-redirects';
import type { NotFoundEntry, Redirect } from '@/lib/models';
import { formatDate } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

export function RedirectsManager({ redirects, notFound, query }: { redirects: Redirect[]; notFound: NotFoundEntry[]; query: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ id: '', fromPath: '', toPath: '', code: 301 });
  const [csv, setCsv] = useState(''); const [q, setQ] = useState(query);
  const [sugg, setSugg] = useState<Record<string, { url: string; title: string }[]>>({});
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) => start(async () => { const r = await fn(); if (r.message) (r.ok ? toast.success : toast.error)(r.message); if (r.ok) { after?.(); router.refresh(); } });
  const csvExport = 'data:text/csv;charset=utf-8,' + encodeURIComponent('da,a,codice,visite\n' + redirects.map((r) => `${r.fromPath},${r.toPath},${r.code},${r.hits}`).join('\n'));
  return (
    <>
      <div className="page-title"><div><h1>Redirect e pagine non trovate</h1><p>{redirects.length} redirect attivi · {notFound.length} percorsi 404 registrati. I vecchi URL importati da WordPress sono già gestiti automaticamente.</p></div><div className="actions"><a className="btn btn-outline" href={csvExport} download="redirect.csv">Esporta CSV</a></div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">{form.id ? 'Modifica redirect' : 'Nuovo redirect'}</div>
            <div className="form-row">
              <div className="field"><label>Da (vecchio percorso)</label><input className="input" value={form.fromPath} onChange={(e) => setForm({ ...form, fromPath: e.target.value })} placeholder="/vecchia-pagina" /></div>
              <div className="field"><label>A (nuovo percorso o URL)</label><input className="input" value={form.toPath} onChange={(e) => setForm({ ...form, toPath: e.target.value })} placeholder="/categoria/nuovo-articolo" /></div>
              <div className="field" style={{ maxWidth: 140 }}><label>Tipo</label><select className="select" value={form.code} onChange={(e) => setForm({ ...form, code: Number(e.target.value) })}><option value={301}>301 permanente</option><option value={302}>302 temporaneo</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary btn-sm" disabled={pending || !form.fromPath || !form.toPath} onClick={() => run(() => saveRedirectAction(form), () => setForm({ id: '', fromPath: '', toPath: '', code: 301 }))}>Salva</button>{form.id && <button className="btn btn-ghost btn-sm" onClick={() => setForm({ id: '', fromPath: '', toPath: '', code: 301 })}>Annulla</button>}</div>
          </div>
          <div className="panel"><div className="panel-title">Importa da CSV</div>
            <p className="help">Una riga per redirect: <code>/vecchio-percorso,/nuovo-percorso</code> (terza colonna facoltativa: 301 o 302). Accetta anche URL completi.</p>
            <textarea className="textarea" style={{ minHeight: 100, fontFamily: 'monospace', fontSize: 12 }} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'/2019/05/vecchio-articolo.html,/politica/nuovo-articolo\n/rubrica-vecchia,/opinioni'} />
            <button className="btn btn-outline btn-sm" disabled={pending || !csv.trim()} onClick={() => run(() => importRedirectsAction(csv), () => setCsv(''))}>Importa</button>
          </div>
          <form className="filters" onSubmit={(e) => { e.preventDefault(); router.push(q ? `/admin/redirect?q=${encodeURIComponent(q)}` : '/admin/redirect'); }}><input className="input grow" placeholder="Cerca nei redirect…" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-outline btn-sm" type="submit">Cerca</button></form>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Da</th><th>A</th><th>Tipo</th><th>Visite</th><th></th></tr></thead>
            <tbody>
              {redirects.map((r) => <tr key={r.id}><td><code>{r.fromPath}</code></td><td><code>{r.toPath}</code></td><td>{r.code}</td><td>{r.hits}</td><td><div className="t-actions"><button className="icon-btn" onClick={() => setForm({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, code: r.code })}>✎</button><ActionButton className="icon-btn danger" confirm="Eliminare questo redirect?" action={() => deleteRedirectAction(r.id)}>🗑</ActionButton></div></td></tr>)}
              {redirects.length === 0 && <tr><td colSpan={5} className="help">Nessun redirect manuale.</td></tr>}
            </tbody></table></div>
        </div>
        <div>
          <div className="panel"><div className="panel-title">Pagine non trovate più richieste <ActionButton className="btn btn-ghost btn-sm" confirm="Svuotare il registro dei 404?" action={() => clearNotFoundAction()}>Svuota</ActionButton></div>
            <p className="help">Ogni 404 reale viene registrato: da qui puoi creare il redirect giusto con un clic. I suggerimenti cercano l&apos;articolo più simile allo slug.</p>
            {notFound.map((n) => (
              <div key={n.path} style={{ borderBottom: '1px solid var(--gray-200)', padding: '8px 0', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><code style={{ wordBreak: 'break-all' }}>{n.path}</code><b style={{ whiteSpace: 'nowrap' }}>{n.hits}×</b></div>
                <div className="help">ultima {formatDate(n.lastSeen)}{n.referer && <> · da {n.referer.slice(0, 60)}</>}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setForm({ id: '', fromPath: n.path, toPath: '', code: 301 })}>Crea redirect</button>
                  <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => setSugg({ ...sugg, [n.path]: await suggestRedirectAction(n.path) }))}>Suggerisci</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => run(() => deleteNotFoundAction(n.path))}>Ignora</button>
                </div>
                {sugg[n.path] && <div style={{ marginTop: 6 }}>{sugg[n.path].length === 0 ? <span className="help">Nessun articolo simile.</span> : sugg[n.path].map((s) => <button key={s.url} className="btn btn-dark btn-sm" style={{ margin: '2px 4px 2px 0' }} onClick={() => run(() => saveRedirectAction({ fromPath: n.path, toPath: s.url, code: 301 }))}>→ {s.title.slice(0, 50)}</button>)}</div>}
              </div>
            ))}
            {notFound.length === 0 && <p className="help">Nessun 404 registrato: ottimo segno.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
