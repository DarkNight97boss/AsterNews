'use client';

import { useState } from 'react';
import { addCommentAction, flagCommentAction, voteCommentAction } from '@/lib/actions-readers';
import type { Comment } from '@/lib/models';
import { relativeDate } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

/** Commenti annidati (risposte), voti "utile", risposta della redazione evidenziata, segnalazione. */
export function CommentsThread({ articleId, comments, votedIds, canReply, readerName }: { articleId: string; comments: Comment[]; votedIds: string[]; canReply: boolean; readerName: string }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { n: number; v: boolean }>>(Object.fromEntries(comments.map((c) => [c.id, { n: c.votes ?? 0, v: votedIds.includes(c.id) }])));
  const roots = comments.filter((c) => !c.parentId); const children = (id: string) => comments.filter((c) => c.parentId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const vote = async (id: string) => { const r = await voteCommentAction(id); if (r.ok && r.votes !== undefined) setVotes({ ...votes, [id]: { n: r.votes, v: !!r.voted } }); };
  const Item = ({ c, depth }: { c: Comment; depth: number }) => (
    <div className={`comment ${c.staff ? 'staff' : ''} ${depth ? 'reply' : ''}`}>
      <div className="c-head"><b>{c.authorName}{c.staff && <span className="badge-staff">Redazione</span>}{!c.staff && c.readerId && <span className="badge-reader" title="Lettore registrato"> ✓</span>}</b><span>{relativeDate(c.createdAt)}</span></div>
      <p>{c.body}</p>
      <div className="c-actions">
        <button type="button" className={`vote-btn ${votes[c.id]?.v ? 'on' : ''}`} onClick={() => vote(c.id)}>👍 {votes[c.id]?.n ?? 0}</button>
        {canReply && depth === 0 && <button type="button" className="flag-btn" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>↩ Rispondi</button>}
        <FlagBtn id={c.id} />
      </div>
      {replyTo === c.id && <ReplyForm articleId={articleId} parentId={c.id} readerName={readerName} onDone={() => setReplyTo(null)} />}
      {children(c.id).map((r) => <Item key={r.id} c={r} depth={depth + 1} />)}
    </div>
  );
  return <>{roots.map((c) => <Item key={c.id} c={c} depth={0} />)}</>;
}
function FlagBtn({ id }: { id: string }) { const [done, setDone] = useState(false); return <button type="button" className="flag-btn" disabled={done} onClick={async () => { const r = await flagCommentAction(id); setDone(true); toast.info(r.message ?? ''); }}>{done ? 'Segnalato' : '⚑ Segnala'}</button>; }
function ReplyForm({ articleId, parentId, readerName, onDone }: { articleId: string; parentId: string; readerName: string; onDone: () => void }) {
  const [f, setF] = useState({ authorName: '', email: '', body: '' }); const [pending, setPending] = useState(false);
  return (
    <form className="reply-form" onSubmit={async (e) => { e.preventDefault(); setPending(true); const r = await addCommentAction({ articleId, parentId, ...f }); setPending(false); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) onDone(); }}>
      {!readerName && <div className="form-row"><input className="input" placeholder="Nome" value={f.authorName} onChange={(e) => setF({ ...f, authorName: e.target.value })} required /><input className="input" type="email" placeholder="Email (non pubblicata)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required /></div>}
      <textarea className="textarea" placeholder="La tua risposta" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} required />
      <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-dark btn-sm" disabled={pending}>Rispondi</button><button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>Annulla</button></div>
    </form>
  );
}
