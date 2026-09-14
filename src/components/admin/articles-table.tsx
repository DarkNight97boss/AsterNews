'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { bulkDeleteAction, bulkStatusAction, deleteArticleAction, duplicateArticleAction, setArticleStatusAction } from '@/lib/actions';
import { Article, ArticleStatus, Category, FORMAT_LABELS, STATUS_LABELS, User } from '@/lib/models';
import { Permission } from '@/lib/permissions';
import { timeAgo } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { statusBadgeClass } from './badges';

type SortKey = 'updatedAt' | 'title' | 'views';
interface Props { articles: Article[]; categories: Category[]; users: User[]; me: User; permissions: Permission[]; publicIds: string[]; initialStatus?: string }
const STATUSES: ArticleStatus[] = ['draft', 'review', 'scheduled', 'published', 'archived'];
const compact = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n));

export function ArticlesTable({ articles, categories, users, me, permissions, publicIds, initialStatus = '' }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const can = (p: Permission) => permissions.includes(p);
  const canEdit = (a: Article) => can('article.edit.any') || a.authorId === me.id;
  const [q, setQ] = useState(''); const [status, setStatus] = useState(initialStatus); const [cat, setCat] = useState(''); const [author, setAuthor] = useState('');
  const [sort, setSort] = useState<SortKey>('updatedAt'); const [dir, setDir] = useState<1 | -1>(-1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const catOf = (id: string) => categories.find((c) => c.id === id); const userOf = (id: string) => users.find((u) => u.id === id);
  const counts = useMemo(() => { const r: Record<string, number> = { draft: 0, review: 0, scheduled: 0, published: 0, archived: 0 }; articles.forEach((a) => r[a.status]++); return r; }, [articles]);
  const filtered = useMemo(() => articles
    .filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.slug.includes(q.toLowerCase()))
    .filter((a) => !status || a.status === status).filter((a) => !cat || a.categoryId === cat).filter((a) => !author || a.authorId === author)
    .sort((x, y) => { const a = x[sort] as string | number; const b = y[sort] as string | number; return (a < b ? -1 : a > b ? 1 : 0) * dir; }), [articles, q, status, cat, author, sort, dir]);
  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const sortBy = (k: SortKey) => { if (sort === k) setDir(dir === 1 ? -1 : 1); else { setSort(k); setDir(k === 'title' ? 1 : -1); } };
  const arrow = (k: SortKey) => (sort === k ? (dir === 1 ? '↑' : '↓') : '');
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulk = (fn: () => Promise<{ message?: string }>) => start(async () => { const r = await fn(); if (r.message) toast.success(r.message); setSelected(new Set()); router.refresh(); });

  return (
    <>
      <div className="filters">
        <input className="input grow" placeholder="Cerca per titolo..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tutti gli stati</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]} ({counts[s]})</option>)}
        </select>
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Tutte le categorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {can('article.edit.any') && <select className="select" value={author} onChange={(e) => setAuthor(e.target.value)}><option value="">Tutti gli autori</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        <span className="count">{filtered.length} articoli</span>
      </div>
      {selected.size > 0 && (
        <div className="bulk-bar">
          {selected.size} selezionati:
          {can('article.publish') && <button className="btn btn-success btn-sm" onClick={() => bulk(() => bulkStatusAction([...selected], 'published'))}>Pubblica</button>}
          <button className="btn btn-outline btn-sm" onClick={() => bulk(() => bulkStatusAction([...selected], 'draft'))}>Bozza</button>
          {can('article.publish') && <button className="btn btn-outline btn-sm" onClick={() => bulk(() => bulkStatusAction([...selected], 'archived'))}>Archivia</button>}
          {can('article.delete') && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Eliminare definitivamente ${selected.size} articoli?`)) bulk(() => bulkDeleteAction([...selected])); }}>Elimina</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Annulla</button>
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((a) => a.id)))} /></th>
            <th style={{ width: 70 }}></th><th onClick={() => sortBy('title')}>Titolo {arrow('title')}</th><th>Categoria</th><th>Autore</th><th>Stato</th>
            <th onClick={() => sortBy('views')}>Visite {arrow('views')}</th><th onClick={() => sortBy('updatedAt')}>Aggiornato {arrow('updatedAt')}</th><th></th>
          </tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} /></td>
                <td>{a.coverImage ? <img className="t-thumb" src={a.coverImage} alt="" loading="lazy" /> : <div className="t-thumb" />}</td>
                <td className="t-title">
                  <Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link>
                  <div className="t-sub">
                    {a.format !== 'standard' && <span className="badge badge-gray" style={{ marginRight: 4 }}>{FORMAT_LABELS[a.format]}</span>}
                    {a.featured && <span className="badge badge-dark" style={{ marginRight: 4 }}>In evidenza</span>}
                    {a.breaking && <span className="badge badge-red" style={{ marginRight: 4 }}>Ultim&apos;ora</span>}
                    /{a.slug}
                  </div>
                </td>
                <td><span className="status-dot" style={{ background: catOf(a.categoryId)?.color }} />{catOf(a.categoryId)?.name}</td>
                <td><div className="t-user"><img src={userOf(a.authorId)?.avatar} alt="" />{userOf(a.authorId)?.name}</div></td>
                <td><span className={statusBadgeClass(a.status)}>{STATUS_LABELS[a.status]}</span>{a.status === 'scheduled' && a.scheduledAt && <div style={{ fontSize: 11, color: 'var(--gray-500)' }} suppressHydrationWarning>{timeAgo(a.scheduledAt)}</div>}</td>
                <td>{compact(a.views)}</td>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-600)' }} suppressHydrationWarning>{timeAgo(a.updatedAt)}</td>
                <td><div className="t-actions">
                  {publicIds.includes(a.id) && <Link className="icon-btn" href={`/${catOf(a.categoryId)?.slug}/${a.slug}`} target="_blank" title="Vedi sul sito">↗</Link>}
                  {canEdit(a) && <Link className="icon-btn" href={`/admin/articoli/${a.id}`} title="Modifica">✎</Link>}
                  {can('article.publish') && canEdit(a) && a.status !== 'published' && <ActionButton className="icon-btn" title="Pubblica" action={() => setArticleStatusAction(a.id, 'published')}>✔</ActionButton>}
                  {can('article.create') && <ActionButton className="icon-btn" title="Duplica" action={() => duplicateArticleAction(a.id)} onDone={(r) => r && r.ok && r.id && router.push(`/admin/articoli/${r.id}`)}>⧉</ActionButton>}
                  {(can('article.delete') || (a.authorId === me.id && a.status === 'draft')) && <ActionButton className="icon-btn danger" title="Elimina" confirm={`Eliminare "${a.title}"?`} action={() => deleteArticleAction(a.id)}>🗑</ActionButton>}
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9}><div className="empty"><h3>Nessun articolo</h3><p>Prova a cambiare i filtri o crea un nuovo articolo.</p></div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
