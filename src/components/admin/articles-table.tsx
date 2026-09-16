'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { bulkDeleteAction, bulkStatusAction, deleteArticleAction, duplicateArticleAction, setArticleStatusAction } from '@/lib/actions';
import { emptyTrashAction, purgeArticleAction, restoreArticleAction } from '@/lib/actions-system';
import { Article, ArticleStatus, Category, FORMAT_LABELS, STATUS_LABELS, User } from '@/lib/models';
import { Permission } from '@/lib/permissions';
import { timeAgo } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';
import { statusBadgeClass } from './badges';

interface Filters { q: string; status: string; categoria: string; autore: string; ordina: string; dir: string; cestino: string }
interface Props { trashCount: number; articles: Article[]; total: number; page: number; perPage: number; counts: Record<string, number>; categories: Category[]; users: User[]; me: User; permissions: Permission[]; filters: Filters }
const STATUSES: ArticleStatus[] = ['draft', 'review', 'scheduled', 'published', 'archived'];
const compact = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n));

/** Tabella paginata lato server: filtri e ordinamento vivono nell'URL, selezione e azioni bulk nel client. */
export function ArticlesTable({ trashCount, articles, total, page, perPage, counts, categories, users, me, permissions, filters }: Props) {
  const router = useRouter(); const pathname = usePathname();
  const [, start] = useTransition();
  const [q, setQ] = useState(filters.q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const can = (p: Permission) => permissions.includes(p);
  const canEdit = (a: Article) => can('article.edit.any') || a.authorId === me.id;
  const catOf = (id: string) => categories.find((c) => c.id === id); const userOf = (id: string) => users.find((u) => u.id === id);
  const go = (patch: Partial<Filters & { pagina: string }>) => { const next = { ...filters, pagina: '', ...patch }; const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString(); router.push(qs ? `${pathname}?${qs}` : pathname); };
  const sortBy = (k: string) => go({ ordina: k, dir: filters.ordina === k && filters.dir === 'desc' ? 'asc' : 'desc' });
  const arrow = (k: string) => (filters.ordina === k ? (filters.dir === 'asc' ? '↑' : '↓') : '');
  const pages = Math.max(1, Math.ceil(total / perPage));
  const allSelected = articles.length > 0 && articles.every((a) => selected.has(a.id));
  const trash = filters.cestino === '1';
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulk = (fn: () => Promise<{ message?: string }>) => start(async () => { const r = await fn(); if (r.message) toast.success(r.message); setSelected(new Set()); router.refresh(); });
  return (
    <>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); go({ q }); }}>
        <input className="input grow" placeholder="Cerca nel titolo, nel testo, nello slug…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={filters.status} onChange={(e) => go({ status: e.target.value })}><option value="">Tutti gli stati</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]} ({counts[s] ?? 0})</option>)}</select>
        <select className="select" value={filters.categoria} onChange={(e) => go({ categoria: e.target.value })}><option value="">Tutte le categorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {can('article.edit.any') && <select className="select" value={filters.autore} onChange={(e) => go({ autore: e.target.value })}><option value="">Tutti gli autori</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        <button className="btn btn-outline btn-sm" type="submit">Filtra</button>
        <span className="count">{total} articoli · pagina {page} di {pages}</span>
        {can('article.delete') && <button type="button" className={`btn btn-sm ${trash ? 'btn-dark' : 'btn-ghost'}`} onClick={() => go({ cestino: trash ? '' : '1', status: '' })}>🗑 Cestino {trashCount > 0 && <span className="pill">{trashCount}</span>}</button>}
      </form>
      {trash && <div className="lock-banner" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><span>Gli articoli nel cestino vengono eliminati definitivamente dopo 30 giorni. Puoi ripristinarli o cancellarli subito.</span>{articles.length > 0 && <ActionButton className="btn btn-danger btn-sm" confirm="Svuotare il cestino? L'operazione non si può annullare." action={emptyTrashAction}>Svuota cestino</ActionButton>}</div>}
      {selected.size > 0 && (
        <div className="bulk-bar">{selected.size} selezionati:
          {can('article.publish') && <button className="btn btn-success btn-sm" onClick={() => bulk(() => bulkStatusAction([...selected], 'published'))}>Pubblica</button>}
          <button className="btn btn-outline btn-sm" onClick={() => bulk(() => bulkStatusAction([...selected], 'draft'))}>Bozza</button>
          {can('article.publish') && <button className="btn btn-outline btn-sm" onClick={() => bulk(() => bulkStatusAction([...selected], 'archived'))}>Archivia</button>}
          {can('article.delete') && <button className="btn btn-danger btn-sm" onClick={() => { if (confirm(`Eliminare definitivamente ${selected.size} articoli?`)) bulk(() => bulkDeleteAction([...selected])); }}>Elimina</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Annulla</button>
        </div>
      )}
      <div className="table-wrap"><table className="table">
        <thead><tr><th style={{ width: 36 }}><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(articles.map((a) => a.id)))} /></th><th style={{ width: 70 }}></th><th onClick={() => sortBy('title')}>Titolo {arrow('title')}</th><th>Categoria</th><th>Autore</th><th>Stato</th><th onClick={() => sortBy('views')}>Visite {arrow('views')}</th><th>SEO</th><th onClick={() => sortBy('updated')}>Aggiornato {arrow('updated')}</th><th></th></tr></thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id}>
              <td><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} /></td>
              <td>{a.coverImage ? <img className="t-thumb" src={a.coverImage} alt="" loading="lazy" /> : <div className="t-thumb" />}</td>
              <td className="t-title"><Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link><div className="t-sub">{a.format !== 'standard' && <span className="badge badge-gray" style={{ marginRight: 4 }}>{FORMAT_LABELS[a.format]}</span>}{a.featured && <span className="badge badge-dark" style={{ marginRight: 4 }}>In evidenza</span>}{a.breaking && <span className="badge badge-red" style={{ marginRight: 4 }}>Ultim&apos;ora</span>}/{a.slug}</div></td>
              <td><span className="status-dot" style={{ background: catOf(a.categoryId)?.color }} />{catOf(a.categoryId)?.name}</td>
              <td><div className="t-user"><img src={userOf(a.authorId)?.avatar} alt="" />{userOf(a.authorId)?.name}</div></td>
              <td><span className={statusBadgeClass(a.status)}>{STATUS_LABELS[a.status]}</span>{a.status === 'scheduled' && a.scheduledAt && <div style={{ fontSize: 11, color: 'var(--gray-500)' }} suppressHydrationWarning>{timeAgo(a.scheduledAt)}</div>}</td>
              <td>{compact(a.views)}</td>
              <td>{typeof a.seoScore === 'number' ? <span className="seo-pill" style={{ background: a.seoScore >= 80 ? '#0b7a4b' : a.seoScore >= 55 ? '#e67e00' : '#d7262d' }}>{a.seoScore}</span> : <span className="help">—</span>}</td>
              <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-600)' }} suppressHydrationWarning>{timeAgo(a.updatedAt)}</td>
              <td>{trash ? <div className="t-actions"><ActionButton className="btn btn-outline btn-sm" title="Ripristina" action={() => restoreArticleAction(a.id)}>↩ Ripristina</ActionButton><ActionButton className="icon-btn danger" title="Elimina definitivamente" confirm={`Eliminare definitivamente "${a.title}"?`} action={() => purgeArticleAction(a.id)}>✕</ActionButton></div> : <div className="t-actions">
                {a.status === 'published' && <Link className="icon-btn" href={`/${catOf(a.categoryId)?.slug}/${a.slug}`} target="_blank" title="Vedi sul sito">↗</Link>}
                {canEdit(a) && <Link className="icon-btn" href={`/admin/articoli/${a.id}`} title="Modifica">✎</Link>}
                {can('article.publish') && canEdit(a) && a.status !== 'published' && <ActionButton className="icon-btn" title="Pubblica" action={() => setArticleStatusAction(a.id, 'published')}>✔</ActionButton>}
                {can('article.create') && <ActionButton className="icon-btn" title="Duplica" action={() => duplicateArticleAction(a.id)} onDone={(r) => r && r.ok && r.id && router.push(`/admin/articoli/${r.id}`)}>⧉</ActionButton>}
                {(can('article.delete') || (a.authorId === me.id && a.status === 'draft')) && <ActionButton className="icon-btn danger" title="Sposta nel cestino" confirm={`Spostare "${a.title}" nel cestino?`} action={() => deleteArticleAction(a.id)}>🗑</ActionButton>}
              </div>}</td>
            </tr>
          ))}
          {articles.length === 0 && <tr><td colSpan={10}><div className="empty"><h3>{trash ? 'Il cestino è vuoto' : 'Nessun articolo'}</h3><p>{trash ? 'Gli articoli eliminati compaiono qui per 30 giorni.' : 'Prova a cambiare i filtri o crea un nuovo articolo.'}</p></div></td></tr>}
        </tbody></table></div>
      {pages > 1 && <nav className="pager" style={{ marginTop: 16 }}>{page > 1 && <button className="btn btn-outline btn-sm" onClick={() => go({ pagina: String(page - 1) })}>← Precedenti</button>}<span className="help">Pagina {page} di {pages}</span>{page < pages && <button className="btn btn-dark btn-sm" onClick={() => go({ pagina: String(page + 1) })}>Successivi →</button>}</nav>}
    </>
  );
}
