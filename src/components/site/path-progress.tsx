'use client';
import { useEffect, useState } from 'react';

/** Avanzamento di un percorso di lettura: resta nel browser. */
export function PathProgress({ slug, steps }: { slug: string; steps: { id: string; url: string; title: string; note: string; minutes: number }[] }) {
  const key = `aster_path_${slug}`; const [done, setDone] = useState<string[]>([]);
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { /* */ } }, [key]);
  const toggle = (id: string) => { const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id]; setDone(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* */ } };
  const n = steps.filter((s) => done.includes(s.id)).length; const nextStep = steps.find((s) => !done.includes(s.id));
  return (
    <div className="path"><div className="path-bar" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={n} aria-label="Tappe completate"><span style={{ width: `${(n / steps.length) * 100}%` }} /></div><p className="help">{n === steps.length ? 'Percorso completato. 🎉' : `${n} di ${steps.length} tappe · ${nextStep ? `prossima: circa ${nextStep.minutes} min` : ''}`}</p>
      <ol>{steps.map((s, i) => <li key={s.id} className={done.includes(s.id) ? 'done' : s.id === nextStep?.id ? 'next' : ''}><span className="path-n">{done.includes(s.id) ? '✓' : i + 1}</span><div><a href={s.url} onClick={() => { if (!done.includes(s.id)) toggle(s.id); }}>{s.title}</a>{s.note && <p>{s.note}</p>}<span className="help">{s.minutes} min · <button type="button" className="linklike" onClick={() => toggle(s.id)}>{done.includes(s.id) ? 'segna come da leggere' : 'segna come letta'}</button></span></div></li>)}</ol>
    </div>
  );
}
