'use client';

import { useEffect, useState } from 'react';
import { getPollAction, votePollAction } from '@/lib/actions-editorial';
import type { Poll } from '@/lib/models';

export function PollWidget({ id }: { id: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [voted, setVoted] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getPollAction(id).then((r) => { setPoll(r.poll ?? null); setVoted(r.voted); }); }, [id]);
  if (!poll) return <div className="poll" aria-busy="true">Caricamento sondaggio…</div>;
  const total = poll.votes.reduce((a, b) => a + b, 0);
  const vote = async (i: number) => { setBusy(true); const r = await votePollAction(id, i); setBusy(false); if (r.poll) setPoll(r.poll); if (r.ok) setVoted(i); };
  return (
    <div className="poll" role="group" aria-label={poll.question}>
      <div className="poll-q">📊 {poll.question}</div>
      {voted === null ? (
        <div className="poll-options">{poll.options.map((o, i) => <button key={i} type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => vote(i)}>{o}</button>)}</div>
      ) : (
        <div className="poll-results">{poll.options.map((o, i) => { const pct = total ? Math.round((poll.votes[i] / total) * 100) : 0; return <div key={i} className={`poll-row ${voted === i ? 'mine' : ''}`}><div className="poll-label"><span>{o}</span><b>{pct}%</b></div><div className="poll-bar"><span style={{ width: `${pct}%` }} /></div></div>; })}<div className="poll-total">{total} vot{total === 1 ? 'o' : 'i'}</div></div>
      )}
    </div>
  );
}
