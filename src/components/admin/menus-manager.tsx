'use client';

import { useState, useTransition } from 'react';
import { saveMenusAction } from '@/lib/actions-pages';
import type { MenuItem, MenusSettings } from '@/lib/models';
import { uid } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

type Sugg = { label: string; url: string };
const move = <T,>(arr: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= arr.length) return arr; const c = [...arr]; [c[i], c[j]] = [c[j], c[i]]; return c; };

/** Menu personalizzati: testata (con sottovoci) e piè di pagina. Se il menu testata non è attivo, il sito usa le categorie. */
export function MenusManager({ initial, suggestions }: { initial: MenusSettings; suggestions: Sugg[] }) {
  const [m, setM] = useState<MenusSettings>(initial); const [pending, start] = useTransition();
  const setList = (k: 'header' | 'footer', items: MenuItem[]) => setM({ ...m, [k]: items });
  const Editor = ({ k, nested }: { k: 'header' | 'footer'; nested: boolean }) => {
    const items = m[k];
    const upd = (i: number, patch: Partial<MenuItem>) => setList(k, items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    return (
      <div className="menu-editor">
        {items.map((it, i) => (
          <div key={it.id} className="menu-item">
            <div className="menu-row"><input className="input" placeholder="Etichetta" value={it.label} onChange={(e) => upd(i, { label: e.target.value })} /><input className="input" placeholder="/indirizzo o https://…" value={it.url} onChange={(e) => upd(i, { url: e.target.value })} /><div className="t-actions"><button className="icon-btn" disabled={i === 0} onClick={() => setList(k, move(items, i, -1))}>↑</button><button className="icon-btn" disabled={i === items.length - 1} onClick={() => setList(k, move(items, i, 1))}>↓</button>{nested && <button className="icon-btn" title="Aggiungi sottovoce" onClick={() => upd(i, { children: [...(it.children ?? []), { id: uid('mi'), label: '', url: '' }] })}>＋</button>}<button className="icon-btn danger" onClick={() => setList(k, items.filter((_, j) => j !== i))}>✕</button></div></div>
            {nested && (it.children ?? []).map((c, ci) => <div key={c.id} className="menu-row sub"><span className="help">↳</span><input className="input" placeholder="Sottovoce" value={c.label} onChange={(e) => upd(i, { children: it.children!.map((x, j) => (j === ci ? { ...x, label: e.target.value } : x)) })} /><input className="input" placeholder="/indirizzo" value={c.url} onChange={(e) => upd(i, { children: it.children!.map((x, j) => (j === ci ? { ...x, url: e.target.value } : x)) })} /><button className="icon-btn danger" onClick={() => upd(i, { children: it.children!.filter((_, j) => j !== ci) })}>✕</button></div>)}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setList(k, [...items, { id: uid('mi'), label: '', url: '' }])}>+ Voce vuota</button>
          <select className="select" style={{ maxWidth: 260 }} value="" onChange={(e) => { const s = suggestions[Number(e.target.value)]; if (s) setList(k, [...items, { id: uid('mi'), label: s.label, url: s.url }]); }}><option value="">Aggiungi da elenco…</option>{suggestions.map((s, i) => <option key={i} value={i}>{s.label} · {s.url}</option>)}</select>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="page-title"><div><h1>Menu del sito</h1><p>Voci della testata e del piè di pagina. Senza menu personalizzato la testata mostra le categorie con «Mostra nel menu».</p></div><div className="actions"><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveMenusAction(m); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Salva menu</button></div></div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Testata</div>
          <label className="switch" style={{ marginBottom: 12 }}><input type="checkbox" checked={m.useCustomHeader} onChange={(e) => setM({ ...m, useCustomHeader: e.target.checked })} /> Usa questo menu al posto delle categorie</label>
          <Editor k="header" nested />
        </div>
        <div className="panel"><div className="panel-title">Piè di pagina</div><p className="help" style={{ marginBottom: 10 }}>Se vuoto, il piè di pagina elenca le pagine con «Mostra nel menu».</p><Editor k="footer" nested={false} /></div>
      </div>
    </>
  );
}
