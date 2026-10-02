'use client';
import { useState } from 'react';

export function GuessTitle({ quiz }: { quiz: { excerpt: string; options: string[]; answer: number }[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({}); const score = quiz.filter((q, i) => picked[i] === q.answer).length; const done = Object.keys(picked).length === quiz.length;
  return <ol className="guess">{quiz.map((q, i) => <li key={i}><p>«{q.excerpt}»</p><div className="guess-opts">{q.options.map((o, k) => <button key={k} type="button" disabled={picked[i] !== undefined} className={picked[i] === undefined ? '' : k === q.answer ? 'right' : picked[i] === k ? 'wrong' : ''} onClick={() => setPicked({ ...picked, [i]: k })}>{o}</button>)}</div></li>)}{done && quiz.length > 0 && <p className="trust-score"><b>{score}/{quiz.length}</b> titoli indovinati.</p>}</ol>;
}
