'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteCategoryAction, moveCategoryAction, saveCategoryAction } from '@/lib/actions';
import { saveCustomFieldsAction } from '@/lib/actions-pages';
import type { CustomField } from '@/lib/models';
import { CATEGORY_KIND_LABELS, Category, CategoryKind } from '@/lib/models';
import { slugify } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

export function CategoriesManager({ categories, counts, customFields = {} }: { categories: Category[]; counts: Record<string, number>; customFields?: Record<string, CustomField[]> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [fieldsText, setFieldsText] = useState('');
  const fieldsToText = (f: CustomField[]) => f.map((x) => `${x.key} | ${x.label} | ${x.type}${x.options ? ' | ' + x.options : ''}`).join('\n');
  const textToFields = (t: string): CustomField[] => t.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]).map((p) => ({ key: p[0], label: p[1] || p[0], type: (['text', 'number', 'date', 'url', 'rating', 'select'].includes(p[2] ?? '') ? p[2] : 'text') as CustomField['type'], ...(p[3] ? { options: p[3] } : {}) }));
  const [pending, start] = useTransition();
  const save = () => start(async () => { const r = await saveCategoryAction(editing!); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { const id = r.id ?? editing!.id; if (id) await saveCustomFieldsAction(id, textToFields(fieldsText)); setEditing(null); router.refresh(); } });
  return (
    <>
      <div className="page-title"><div><h1>Categorie</h1><p>Sezioni del sito, ordine del menu e colori.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setEditing({ id: '', slug: '', name: '', kind: 'standard', color: '#d7262d', description: '', order: categories.length + 1, showInMenu: true, showOnHome: true })}>+ Nuova categoria</button></div></div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Ordine</th><th>Nome</th><th>Slug</th><th>Articoli</th><th>Menu</th><th>Home</th><th></th></tr></thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c.id}>
              <td><div style={{ display: 'flex', gap: 2 }}><ActionButton className="icon-btn" disabled={i === 0} action={() => moveCategoryAction(c.id, -1)}>↑</ActionButton><ActionButton className="icon-btn" disabled={i === categories.length - 1} action={() => moveCategoryAction(c.id, 1)}>↓</ActionButton></div></td>
              <td className="t-title"><span className="status-dot" style={{ background: c.color }} />{c.name} {c.kind !== 'standard' && <span className="badge badge-gray" style={{ marginLeft: 6 }}>{c.kind}</span>}<div className="t-sub">{c.description}</div></td>
              <td><code>/{c.slug}</code></td><td>{counts[c.id] ?? 0}</td><td>{c.showInMenu ? '✔' : '—'}</td><td>{c.showOnHome ? '✔' : '—'}</td>
              <td><div className="t-actions"><button className="icon-btn" onClick={() => { setEditing({ ...c }); setFieldsText(fieldsToText(customFields[c.id] ?? [])); }}>✎</button><ActionButton className="icon-btn danger" confirm={`Eliminare "${c.name}"? Gli articoli verranno spostati nella prima categoria disponibile.`} action={() => deleteCategoryAction(c.id)}>🗑</ActionButton></div></td>
            </tr>
          ))}
        </tbody></table></div>
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}><div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head"><h3>{editing.id ? 'Modifica' : 'Nuova'} categoria</h3><button className="icon-btn" onClick={() => setEditing(null)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Nome</label><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: slugify(e.target.value) })} /></div>
            <div className="field"><label>Slug</label><input className="input" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
            <div className="field"><label>Descrizione</label><textarea className="textarea" style={{ minHeight: 60 }} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="field"><label>Campi personalizzati (uno per riga: chiave | Etichetta | tipo)</label><textarea className="textarea" style={{ minHeight: 70, fontFamily: 'monospace', fontSize: 12 }} value={fieldsText} onChange={(e) => setFieldsText(e.target.value)} placeholder={'punteggio | Punteggio | rating\nluogo | Luogo | text\nprezzo | Prezzo | text\ngenere | Genere | select | Rock, Pop, Jazz'} /><div className="help">Tipi: text, number, date, url, rating (stelle), select (opzioni dopo un quarto «|»). Compaiono nell&apos;editor come scheda e nell&apos;articolo come riquadro.</div></div>
            <div className="field"><label>Tipo di sezione</label><select className="select" value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as CategoryKind })}>{(Object.keys(CATEGORY_KIND_LABELS) as CategoryKind[]).map((k) => <option key={k} value={k}>{CATEGORY_KIND_LABELS[k]}</option>)}</select></div>
            <div className="field"><label>Colore</label><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input className="color-input" type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} /><input className="input" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} /></div></div>
            <label className="switch" style={{ marginBottom: 10 }}><input type="checkbox" checked={editing.showInMenu} onChange={(e) => setEditing({ ...editing, showInMenu: e.target.checked })} /> Mostra nel menu</label><br />
            <label className="switch"><input type="checkbox" checked={editing.showOnHome} onChange={(e) => setEditing({ ...editing, showOnHome: e.target.checked })} /> Sezione in homepage</label>
          </div>
          <div className="modal-foot"><button className="btn btn-ghost" onClick={() => setEditing(null)}>Annulla</button><button className="btn btn-primary" disabled={!editing.name.trim() || pending} onClick={save}>Salva</button></div>
        </div></div>
      )}
    </>
  );
}
