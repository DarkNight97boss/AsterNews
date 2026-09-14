'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteTagAction, saveTagAction } from '@/lib/actions';
import { Tag } from '@/lib/models';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

export function TagsManager({ tags, counts, serverQuery = '' }: { tags: Tag[]; counts: Record<string, number>; serverQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(serverQuery); const [name, setName] = useState(''); const [editing, setEditing] = useState<Tag | null>(null);
  const [pending, start] = useTransition();
  const save = (t: Tag) => start(async () => { const r = await saveTagAction(t); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setEditing(null); setName(''); router.refresh(); } });
  const filtered = tags.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="page-title"><div><h1>Tag</h1><p>{tags.length} argomenti</p></div></div>
      <div className="panel"><div className="panel-title">Nuovo tag</div>
        <form style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); save({ id: '', slug: '', name }); }}><input className="input" style={{ maxWidth: 320 }} placeholder="Nome tag" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-primary" type="submit" disabled={!name.trim() || pending}>Aggiungi</button></form>
      </div>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); router.push(q ? `/admin/tag?q=${encodeURIComponent(q)}` : '/admin/tag'); }}><input className="input grow" placeholder="Cerca tra tutti i tag..." value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-outline btn-sm" type="submit">Cerca</button><span className="count">{tags.length} tag mostrati</span></form>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Nome</th><th>Slug</th><th>Articoli</th><th></th></tr></thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id}>
              <td className="t-title">{editing?.id === t.id ? <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: '' })} onKeyDown={(e) => e.key === 'Enter' && save(editing)} /> : t.name}</td>
              <td><code>/tag/{t.slug}</code></td><td>{counts[t.id] ?? 0}</td>
              <td><div className="t-actions">
                {editing?.id === t.id ? <><button className="btn btn-primary btn-sm" onClick={() => save(editing)}>Salva</button><button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Annulla</button></>
                  : <><button className="icon-btn" onClick={() => setEditing({ ...t })}>✎</button><ActionButton className="icon-btn danger" confirm={`Eliminare il tag "${t.name}"?`} action={() => deleteTagAction(t.id)}>🗑</ActionButton></>}
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
    </>
  );
}
