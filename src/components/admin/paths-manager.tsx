'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/toaster';
import { deletePathAction, savePathAction, type ReadingPath } from '@/lib/actions-paths';

const EMPTY: ReadingPath = { slug: '', title: '', intro: '', steps: [{ articleId: '', note: '' }, { articleId: '', note: '' }] };
export function PathsManager({ paths, titles }: { paths: { id: string; data: ReadingPath }[]; titles: Record<string, string> }) {
  const [id, setId] = useState(''); const [p, setP] = useState<ReadingPath>(EMPTY); const [pending, start] = useTransition(); const router = useRouter();
  const step = (i: number, patch: Partial<ReadingPath['steps'][number]>) => setP({ ...p, steps: p.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div className="admin-grid-2">
      <div className="panel"><div className="panel-title">Percorsi pubblicati</div>{paths.length === 0 && <p className="help">Nessun percorso. Creane uno: bastano due articoli.</p>}<table className="table"><tbody>{paths.map((x) => <tr key={x.id}><td className="t-title"><a href="#" onClick={(e) => { e.preventDefault(); setId(x.id); setP(x.data); }}>{x.data.title}</a><div className="help">{x.data.steps.length} tappe · <a href={`/percorsi/${x.data.slug}`} target="_blank">apri</a></div></td><td style={{ textAlign: 'right' }}><button type="button" className="icon-btn danger" aria-label={`Elimina ${x.data.title}`} onClick={() => start(async () => { await deletePathAction(x.id); router.refresh(); })}>✕</button></td></tr>)}</tbody></table></div>
      <div className="panel"><div className="panel-title">{id ? 'Modifica percorso' : 'Nuovo percorso'}</div>
        <div className="field"><label htmlFor="pt-title">Titolo</label><input id="pt-title" className="input" placeholder="es. Capire il bilancio comunale in 5 tappe" value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></div>
        <div className="field"><label htmlFor="pt-intro">A chi serve e cosa si capisce alla fine</label><textarea id="pt-intro" className="textarea" style={{ minHeight: 60 }} value={p.intro} onChange={(e) => setP({ ...p, intro: e.target.value })} /></div>
        {p.steps.map((s, i) => <div key={i} className="source-row"><span className="help">{i + 1}.</span><input className="input" placeholder="Indirizzo o id dell'articolo" aria-label={`Articolo della tappa ${i + 1}`} value={s.articleId} onChange={(e) => step(i, { articleId: e.target.value })} title={titles[s.articleId] ?? ''} /><input className="input" placeholder="Perché leggerlo" aria-label={`Nota della tappa ${i + 1}`} value={s.note} onChange={(e) => step(i, { note: e.target.value })} /><button type="button" className="icon-btn danger" aria-label="Rimuovi tappa" onClick={() => setP({ ...p, steps: p.steps.filter((_, j) => j !== i) })}>✕</button></div>)}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setP({ ...p, steps: [...p.steps, { articleId: '', note: '' }] })}>+ Tappa</button><button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await savePathAction(id, p); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setId(''); setP(EMPTY); router.refresh(); } })}>Salva percorso</button>{id && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setId(''); setP(EMPTY); }}>Annulla</button>}</div>
      </div>
    </div>
  );
}
