'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deleteCommentAction, setCommentStatusAction } from '@/lib/actions';
import { COMMENT_STATUS_LABELS, Comment, CommentStatus } from '@/lib/models';
import { timeAgo } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';

const STATUSES: CommentStatus[] = ['pending', 'approved', 'rejected', 'spam'];
const CLS: Record<string, string> = { approved: 'badge-green', pending: 'badge-amber', rejected: 'badge-gray', spam: 'badge-red' };

export function CommentsTable({ comments, titles }: { comments: Comment[]; titles: Record<string, string> }) {
  const [filter, setFilter] = useState<CommentStatus | ''>('pending');
  const counts: Record<string, number> = { pending: 0, approved: 0, rejected: 0, spam: 0 };
  comments.forEach((c) => counts[c.status]++);
  const list = comments.filter((c) => !filter || c.status === filter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <div className="page-title"><div><h1>Commenti</h1><p>Moderazione dei commenti dei lettori.</p></div></div>
      <div className="filters">
        {STATUSES.map((s) => <button key={s} className={`btn btn-sm ${filter === s ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter(s)}>{COMMENT_STATUS_LABELS[s]} ({counts[s]})</button>)}
        <button className={`btn btn-sm ${filter === '' ? 'btn-dark' : 'btn-outline'}`} onClick={() => setFilter('')}>Tutti</button>
      </div>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Autore</th><th>Commento</th><th>Articolo</th><th>Stato</th><th></th></tr></thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id}>
              <td><b>{c.authorName}</b><div style={{ fontSize: 12, color: 'var(--gray-500)' }} suppressHydrationWarning>{c.email}<br />{timeAgo(c.createdAt)}</div></td>
              <td style={{ maxWidth: 380 }}>{c.body}</td>
              <td className="t-title"><Link href={`/admin/articoli/${c.articleId}`}>{titles[c.articleId]}</Link></td>
              <td><span className={`badge ${CLS[c.status]}`}>{COMMENT_STATUS_LABELS[c.status]}</span></td>
              <td><div className="t-actions">
                {c.status !== 'approved' && <ActionButton className="btn btn-success btn-sm" action={() => setCommentStatusAction(c.id, 'approved')}>Approva</ActionButton>}
                {c.status !== 'rejected' && <ActionButton action={() => setCommentStatusAction(c.id, 'rejected')}>Rifiuta</ActionButton>}
                {c.status !== 'spam' && <ActionButton action={() => setCommentStatusAction(c.id, 'spam')}>Spam</ActionButton>}
                <ActionButton className="icon-btn danger" confirm="Eliminare il commento?" action={() => deleteCommentAction(c.id)}>🗑</ActionButton>
              </div></td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={5}><div className="empty"><h3>Nessun commento</h3></div></td></tr>}
        </tbody></table></div>
    </>
  );
}
