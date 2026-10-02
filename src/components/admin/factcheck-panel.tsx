'use client';
import { useEffect, useState, useTransition } from 'react';
import { toast } from '@/components/ui/toaster';
import { addFactcheckAction, deleteFactcheckAction, factchecksAction } from '@/lib/actions-civic';

const VERDICTS = ['Vero', 'Falso', 'Impreciso', 'Da verificare', 'Fuori contesto'];
/** Fact-check in diretta: durante lo streaming la redazione annota le affermazioni, il lettore le vede collegate al minuto. */
export function FactcheckPanel({ articleId }: { articleId: string }) {
  const [list, setList] = useState<{ id: string; minute: string; claim: string; verdict: string }[]>([]); const [f, setF] = useState({ minute: '', claim: '', verdict: 'Da verificare', note: '', source: '' }); const [pending, start] = useTransition();
  const load = () => factchecksAction(articleId).then(setList).catch(() => {}); useEffect(() => { load(); }, [articleId]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="panel"><div className="panel-title">Fact-check in diretta</div><p className="help">Minuto del video, affermazione, verdetto: compare nell&apos;articolo live sotto gli aggiornamenti.</p>
    {list.map((x) => <div key={x.id} className="reply-item" style={{ padding: '6px 0' }}><b>{x.minute ? `${x.minute} · ` : ''}{x.verdict}</b> {x.claim} <button type="button" className="icon-btn danger" aria-label="Elimina" onClick={() => start(async () => { await deleteFactcheckAction(x.id); load(); })}>✕</button></div>)}
    <div className="form-row"><input className="input" placeholder="Minuto (es. 1:12:30)" aria-label="Minuto" style={{ maxWidth: 140 }} value={f.minute} onChange={(e) => setF({ ...f, minute: e.target.value })} /><select className="select" aria-label="Verdetto" value={f.verdict} onChange={(e) => setF({ ...f, verdict: e.target.value })}>{VERDICTS.map((v) => <option key={v}>{v}</option>)}</select></div><input className="input" style={{ marginTop: 6 }} placeholder="L'affermazione, testuale" aria-label="Affermazione" value={f.claim} onChange={(e) => setF({ ...f, claim: e.target.value })} /><input className="input" style={{ marginTop: 6 }} placeholder="Perché (una riga)" aria-label="Nota" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /><input className="input" style={{ marginTop: 6 }} placeholder="Fonte (URL)" aria-label="Fonte" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
    <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 6 }} disabled={pending || f.claim.trim().length < 8} onClick={() => start(async () => { const r = await addFactcheckAction(articleId, f); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setF({ ...f, minute: '', claim: '', note: '', source: '' }); load(); } })}>Aggiungi verifica</button></div>;
}
