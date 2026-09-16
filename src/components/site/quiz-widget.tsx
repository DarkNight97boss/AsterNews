'use client';

import { useEffect, useState } from 'react';
import { quizLeaderboardAction, submitQuizAction } from '@/lib/actions-community';

export interface QuizDef { id: string; title: string; questions: { q: string; options: string[]; answer: number; explain?: string }[] }
/** Quiz a risposta multipla con punteggio, classifica e condivisione del risultato. */
export function QuizWidget({ def, articleId }: { def: QuizDef; articleId: string }) {
  const [answers, setAnswers] = useState<number[]>([]); const [done, setDone] = useState<{ score: number; rank?: number; players?: number } | null>(null); const [name, setName] = useState(''); const [board, setBoard] = useState<{ name: string; score: number; total: number }[]>([]);
  const cur = answers.length; const total = def.questions.length;
  useEffect(() => { if (done) quizLeaderboardAction(def.id).then(setBoard); }, [done, def.id]);
  const score = answers.filter((a, i) => a === def.questions[i].answer).length;
  if (done) {
    const text = `Ho fatto ${done.score}/${total} al quiz «${def.title}»${done.rank ? ` (${done.rank}º su ${done.players})` : ''}`;
    return <div className="quiz"><h3>{def.title}</h3><p className="quiz-result">Il tuo risultato: <b>{done.score}/{total}</b>{done.rank ? ` · ${done.rank}º su ${done.players} partecipanti` : ''}</p>
      <div className="quiz-share"><a className="btn btn-outline btn-sm" href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + (typeof location !== 'undefined' ? location.href : ''))}`} target="_blank" rel="noreferrer">WhatsApp</a><a className="btn btn-outline btn-sm" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(typeof location !== 'undefined' ? location.href : '')}`} target="_blank" rel="noreferrer">X</a><button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(text)}>Copia</button></div>
      {board.length > 0 && <ol className="quiz-board">{board.map((b, i) => <li key={i}><span>{b.name}</span><b>{b.score}/{b.total}</b></li>)}</ol>}
      <details className="quiz-review"><summary>Rivedi le risposte</summary>{def.questions.map((q, i) => <div key={i} className={`quiz-q ${answers[i] === q.answer ? 'ok' : 'ko'}`}><b>{q.q}</b><div>{answers[i] === q.answer ? '✔' : '✖'} {q.options[q.answer]}{q.explain ? ` — ${q.explain}` : ''}</div></div>)}</details></div>;
  }
  if (cur >= total) return <div className="quiz"><h3>{def.title}</h3><p>Hai risposto a tutte le domande: {score}/{total}.</p><div className="quiz-share"><input className="input" placeholder="Il tuo nome per la classifica (facoltativo)" value={name} onChange={(e) => setName(e.target.value)} /><button type="button" className="btn btn-primary btn-sm" onClick={async () => { const r = await submitQuizAction(def.id, articleId, score, total, name); setDone({ score, rank: r.rank, players: r.players }); }}>Vedi risultato e classifica</button></div></div>;
  const q = def.questions[cur];
  return <div className="quiz"><h3>{def.title}</h3><div className="quiz-progress">Domanda {cur + 1} di {total}</div><p className="quiz-question">{q.q}</p><div className="quiz-options">{q.options.map((o, i) => <button key={i} type="button" onClick={() => setAnswers([...answers, i])}>{o}</button>)}</div></div>;
}
