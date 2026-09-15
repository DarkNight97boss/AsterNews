'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addNoteAction, assignArticleAction, autosaveAction, deleteNoteAction, discardAutosaveAction, listNotesAction, listRevisionsAction, lockHeartbeatAction, releaseLockAction, resolveNoteAction, restoreRevisionAction } from '@/lib/actions-editorial';
import { Article, ArticleNote, Revision, User } from '@/lib/models';
import { formatDate, stripHtml, toLocalInput } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

/** Differenza parola per parola (LCS semplice) tra due testi: abbastanza per confrontare due versioni di un articolo. */
function diffWords(a: string, b: string): { t: 'eq' | 'ins' | 'del'; v: string }[] {
  const A = a.split(/(\s+)/).filter(Boolean), B = b.split(/(\s+)/).filter(Boolean);
  if (A.length * B.length > 4_000_000) return [{ t: 'del', v: a }, { t: 'ins', v: b }];
  const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { t: 'eq' | 'ins' | 'del'; v: string }[] = []; let i = 0, j = 0;
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { out.push({ t: 'eq', v: A[i] }); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', v: A[i] }); i++; } else { out.push({ t: 'ins', v: B[j] }); j++; } }
  while (i < A.length) out.push({ t: 'del', v: A[i++] }); while (j < B.length) out.push({ t: 'ins', v: B[j++] });
  return out;
}

interface Props { article: Article; isNew: boolean; users: User[]; canAssign: boolean; canPublish: boolean; meId: string; dirty: boolean; onRestoreDraft: (a: Article) => void; onPatch: (p: Partial<Article>) => void }

export function EditorExtras({ article: a, isNew, users, canAssign, canPublish, meId, dirty, onRestoreDraft, onPatch }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lock, setLock] = useState<{ holderName?: string; since?: string } | null>(null);
  const [savedAt, setSavedAt] = useState<string>('');
  const [notes, setNotes] = useState<ArticleNote[]>([]);
  const [revs, setRevs] = useState<Revision[]>([]);
  const [showRevs, setShowRevs] = useState(false);
  const [cmp, setCmp] = useState<Revision | null>(null);
  const [note, setNote] = useState(''); const [assign, setAssign] = useState(a.assignedTo ?? ''); const [deadline, setDeadline] = useState(toLocalInput(a.deadline ?? null));
  const latest = useRef(a); latest.current = a;
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const user = (id: string) => users.find((u) => u.id === id)?.name ?? '—';

  // Blocco modifica concorrente + autosalvataggio ogni 30 s
  useEffect(() => {
    if (isNew) return;
    let alive = true;
    const beat = async () => { const r = await lockHeartbeatAction(a.id); if (!alive) return; setLock(r.ok ? null : { holderName: r.holderName, since: r.since }); };
    beat();
    const t1 = setInterval(beat, 45_000);
    const t2 = setInterval(async () => { if (!dirtyRef.current) return; const r = await autosaveAction(latest.current); if (r.ok && r.at) setSavedAt(r.at); }, 30_000);
    listNotesAction(a.id).then(setNotes);
    return () => { alive = false; clearInterval(t1); clearInterval(t2); releaseLockAction(a.id); };
  }, [a.id, isNew]);

  const loadRevs = () => { setShowRevs(true); listRevisionsAction(a.id).then(setRevs); };
  const addNote = (kind: ArticleNote['kind']) => start(async () => { const r = await addNoteAction(a.id, note, kind); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setNote(''); setNotes(await listNotesAction(a.id)); if (kind === 'changes') router.refresh(); } });
  const restore = (rev: Revision) => { if (!confirm('Ripristinare questa versione? La versione attuale viene salvata nelle revisioni.')) return; start(async () => { const r = await restoreRevisionAction(rev.id); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setCmp(null); router.refresh(); } }); };
  const diff = cmp ? diffWords(stripHtml(cmp.data.content), stripHtml(a.content)) : [];

  return (
    <>
      {lock && <div className="lock-banner">⚠️ <b>{lock.holderName ?? 'Un altro utente'}</b> sta modificando questo articolo ({lock.since ? formatDate(lock.since) : 'ora'}). Le modifiche potrebbero sovrascriversi: coordinatevi prima di salvare.</div>}
      {!isNew && <div className="autosave-hint">{savedAt ? `Bozza salvata automaticamente alle ${new Date(savedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` : 'Salvataggio automatico ogni 30 secondi mentre scrivi.'}</div>}

      <div className="panel"><div className="panel-title">Lavoro di redazione</div>
        {canAssign && (
          <div className="form-row" style={{ alignItems: 'end' }}>
            <div className="field"><label>Assegnato a</label><select className="select" value={assign} onChange={(e) => setAssign(e.target.value)}><option value="">Nessuno</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            <div className="field"><label>Scadenza</label><input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
            <div className="field"><button className="btn btn-outline btn-sm" disabled={pending || isNew} onClick={() => start(async () => { const r = await assignArticleAction(a.id, assign, deadline ? new Date(deadline).toISOString() : null); (r.ok ? toast.success : toast.error)(r.message ?? ''); onPatch({ assignedTo: assign, deadline: deadline ? new Date(deadline).toISOString() : null }); })}>Salva assegnazione</button></div>
          </div>
        )}
        {!canAssign && (a.assignedTo || a.deadline) && <p className="help">Assegnato a <b>{user(a.assignedTo ?? '')}</b>{a.deadline && <> · scadenza {formatDate(a.deadline)}</>}</p>}
        {!isNew && (
          <>
            <div className="field" style={{ marginTop: 8 }}><label>Nota interna (non pubblicata)</label><textarea className="textarea" style={{ minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="es. Verificare il nome dell'assessore prima di pubblicare" /></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-outline btn-sm" disabled={pending || !note.trim()} onClick={() => addNote('note')}>Aggiungi nota</button>
              {canPublish && a.authorId !== meId && <button className="btn btn-dark btn-sm" disabled={pending || !note.trim()} onClick={() => addNote('changes')}>Richiedi modifiche all&apos;autore</button>}
            </div>
            <ul className="notes-list" style={{ marginTop: 12 }}>
              {notes.map((n) => <li key={n.id} className={`${n.kind} ${n.resolved ? 'resolved' : ''}`}><div className="n-head"><span><b>{user(n.userId)}</b> · {n.kind === 'changes' ? 'richiesta modifiche' : 'nota'} · {formatDate(n.createdAt)}</span><span><button className="icon-btn" title={n.resolved ? 'Riapri' : 'Segna come risolta'} onClick={() => start(async () => { await resolveNoteAction(n.id, !n.resolved); setNotes(await listNotesAction(a.id)); })}>{n.resolved ? '↺' : '✓'}</button>{canPublish && <button className="icon-btn danger" onClick={() => start(async () => { await deleteNoteAction(n.id); setNotes(await listNotesAction(a.id)); })}>✕</button>}</span></div>{n.body}</li>)}
              {notes.length === 0 && <li className="help" style={{ border: 0 }}>Nessuna nota.</li>}
            </ul>
          </>
        )}
      </div>

      {!isNew && (
        <div className="panel"><div className="panel-title">Revisioni {!showRevs && <button className="btn btn-ghost btn-sm" onClick={loadRevs}>Mostra storico</button>}</div>
          {showRevs && (
            <>
              <ul className="rev-list">
                {revs.map((r) => <li key={r.id}><span className="grow"><b>{formatDate(r.createdAt)}</b> · {user(r.userId)} · <i>{r.note}</i> · {stripHtml(r.data.content).split(/\s+/).filter(Boolean).length} parole</span><button className="btn btn-ghost btn-sm" onClick={() => setCmp(cmp?.id === r.id ? null : r)}>{cmp?.id === r.id ? 'Chiudi' : 'Confronta'}</button><button className="btn btn-outline btn-sm" disabled={pending} onClick={() => restore(r)}>Ripristina</button></li>)}
                {revs.length === 0 && <li className="help">Nessuna revisione: ogni salvataggio dell&apos;articolo ne crea una (ultime 50).</li>}
              </ul>
              {cmp && <div className="diff" style={{ marginTop: 10 }}><div className="help" style={{ marginBottom: 6 }}>Versione del {formatDate(cmp.createdAt)} → attuale. <del>rosso</del> = rimosso, <ins>verde</ins> = aggiunto. Titolo allora: «{cmp.data.title}»</div>{diff.map((d, i) => d.t === 'eq' ? <span key={i}>{d.v}</span> : d.t === 'ins' ? <ins key={i}>{d.v}</ins> : <del key={i}>{d.v}</del>)}</div>}
            </>
          )}
        </div>
      )}
      <AutosaveRecovery articleId={a.id} isNew={isNew} updatedAt={a.updatedAt} onRestore={onRestoreDraft} />
    </>
  );
}

/** All'apertura, se esiste una bozza automatica più recente dell'ultimo salvataggio, propone di recuperarla. */
function AutosaveRecovery({ articleId, isNew, updatedAt, onRestore }: { articleId: string; isNew: boolean; updatedAt: string; onRestore: (a: Article) => void }) {
  const [draft, setDraft] = useState<{ data: Article; updatedAt: string } | null>(null);
  useEffect(() => { if (isNew) return; fetch(`/api/autosave?id=${articleId}`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && d.updatedAt > updatedAt) setDraft(d); }).catch(() => {}); }, [articleId, isNew, updatedAt]);
  if (!draft) return null;
  return <div className="lock-banner">💾 C&apos;è una bozza salvata automaticamente alle {formatDate(draft.updatedAt)}, più recente dell&apos;ultimo salvataggio. <button className="btn btn-dark btn-sm" onClick={() => { onRestore(draft.data); setDraft(null); }}>Recupera</button> <button className="btn btn-ghost btn-sm" onClick={() => { discardAutosaveAction(articleId); setDraft(null); }}>Ignora</button></div>;
}
