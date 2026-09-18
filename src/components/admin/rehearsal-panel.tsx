'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from '@/components/ui/toaster';
import type { Article } from '@/lib/models';
import { abandonDraftAction, handoffAction, handoffsAction, rehearsalAction, structureDictationAction, styleCheckAction, type Rehearsal, type RehearsalKind } from '@/lib/actions-writing';
import type { StyleDrift } from '@/lib/writing';
import { DictateButton } from './dictate-button';

type Extra = NonNullable<Article['extra']>;
interface Props { article: Article; isNew: boolean; users: { id: string; name: string }[]; meId: string; extra: Extra; setExtra: (p: Partial<Extra>) => void; onInsert: (html: string) => void; onTitle: (t: string) => void }
const LEVEL = { 1: 'non sostenuta', 2: 'attribuzione vaga', 3: 'fonte nominata' } as const;
/** Sala prove: strumenti che non scrivono al posto tuo ma ti mettono alla prova prima di pubblicare. */
export function RehearsalPanel({ article: a, isNew, users, meId, extra, setExtra, onInsert, onTitle }: Props) {
  const [res, setRes] = useState<Rehearsal>({}); const [style, setStyle] = useState<StyleDrift | null>(null); const [busy, setBusy] = useState(''); const [, start] = useTransition();
  const run = (kind: RehearsalKind) => { setBusy(kind); start(async () => { const r = await rehearsalAction(kind, a.title, a.content); setBusy(''); if (!r.ok || !r.data) { toast.error(r.message ?? 'Errore'); return; } setRes((x) => ({ ...x, ...r.data })); if (kind === 'certainty' && r.data.certainty) setExtra({ certainty: { show: extra.certainty?.show ?? false, map: r.data.certainty } }); }); };
  const checkStyle = () => { setBusy('style'); start(async () => { const r = await styleCheckAction(a.content); setBusy(''); if (r.ok && r.data) setStyle(r.data.drift); else toast.error(r.message ?? 'Errore'); }); };
  const map = extra.certainty?.map ?? [];
  return (
    <div className="panel rehearsal"><div className="panel-title">Sala prove</div>
      <p className="help">Non scrivono per te: ti fanno domande, obiettano, si perdono. Così lo scopri prima dei lettori.</p>
      <div className="rehearsal-btns">
        <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => run('questions')}>{busy === 'questions' ? '…' : '❓ Cosa manca'}</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => run('devil')}>{busy === 'devil' ? '…' : '😈 Avvocato del diavolo'}</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => run('readers')}>{busy === 'readers' ? '…' : '👥 Lettori di prova'}</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => run('certainty')}>{busy === 'certainty' ? '…' : '🎚 Certezza'}</button>
        <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={checkStyle}>{busy === 'style' ? '…' : '🖋 Sembra mio?'}</button>
      </div>
      {res.questions && <ul className="rh-list">{res.questions.length === 0 && <li>Nessuna domanda rimasta senza risposta.</li>}{res.questions.map((q, i) => <li key={i}><b>{q.ask}</b><span className="help">«{q.where}…»</span></li>)}</ul>}
      {res.devil && <ul className="rh-list">{res.devil.map((d, i) => <li key={i}><b>{'●'.repeat(d.strength)}{'○'.repeat(Math.max(0, 5 - d.strength))} {d.objection}</b><span className="help">Per rispondere: {d.fix}</span></li>)}</ul>}
      {res.readers && <ul className="rh-list">{res.readers.map((r, i) => <li key={i}><b>{r.who}</b> si perde a «{r.lostAt}…»<span className="help">{r.why}</span></li>)}</ul>}
      {style && <div className={`rh-style ${style.score > 45 ? 'far' : ''}`}><b>{style.score <= 20 ? 'È il tuo stile.' : style.score <= 45 ? 'Un po\' diverso dal solito.' : 'Non sembra scritto da te.'}</b> <span className="help">distanza {style.score}/100</span>{style.notes.length > 0 && <ul>{style.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}</div>}
      {map.length > 0 && <div className="rh-certainty"><ul>{map.map((m, i) => <li key={i} className={`cl-${m.level}`}>«{m.s}…» <span className="help">{LEVEL[m.level]}</span></li>)}</ul><label className="switch"><input type="checkbox" checked={!!extra.certainty?.show} onChange={(e) => setExtra({ certainty: { map, show: e.target.checked } })} /> Mostra la mappa della certezza anche ai lettori</label> <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExtra({ certainty: undefined })}>Rimuovi</button></div>}
      <VoiceDraft onInsert={onInsert} onTitle={onTitle} hasTitle={!!a.title} />
      <div className="panel-title" style={{ marginTop: 16 }}>Un titolo per ogni contesto</div>
      <p className="help">Il titolo principale vale ovunque; qui puoi dirlo in un altro modo dove serve. Quello per Google è nel pannello SEO.</p>
      {(['home', 'social', 'newsletter'] as const).map((k) => <div className="field" key={k}><label htmlFor={`tt-${k}`}>{{ home: 'In home e nelle liste', social: 'Sui social (anteprima del link)', newsletter: 'Nella newsletter' }[k]}</label><input id={`tt-${k}`} className="input" value={extra.titles?.[k] ?? ''} placeholder={a.title} onChange={(e) => { const t = { ...(extra.titles ?? {}), [k]: e.target.value || undefined }; setExtra({ titles: Object.values(t).some(Boolean) ? t : undefined }); }} /></div>)}
      <div className="panel-title" style={{ marginTop: 16 }}>Frasi con data di scadenza <button type="button" className="btn btn-outline btn-sm" onClick={() => setExtra({ expiring: [...(extra.expiring ?? []), { text: '', date: '' }] })}>+ Frase</button></div>
      {(extra.expiring ?? []).length === 0 && <p className="help">«Il sindaco è Rossi», «il cantiere è ancora aperto»: incolla la frase e di&apos; fino a quando è vera. Alla scadenza ti avvisiamo.</p>}
      {(extra.expiring ?? []).map((s, i) => { const upd = (p: Partial<typeof s>) => setExtra({ expiring: (extra.expiring ?? []).map((x, j) => (j === i ? { ...x, ...p } : x)) }); return <div key={i} className="source-row"><input className="input" placeholder="La frase, com'è nel testo" aria-label="Frase" value={s.text} onChange={(e) => upd({ text: e.target.value })} /><input className="input" type="date" style={{ maxWidth: 150 }} aria-label="Vera fino al" value={s.date} onChange={(e) => upd({ date: e.target.value, done: false, reminded: false })} /><button type="button" className="icon-btn danger" aria-label="Rimuovi" onClick={() => setExtra({ expiring: (extra.expiring ?? []).filter((_, j) => j !== i) })}>✕</button></div>; })}
      {!isNew && <Handoff articleId={a.id} users={users.filter((u) => u.id !== meId)} />}
      {!isNew && a.status !== 'published' && <Abandon id={a.id} abandoned={extra.abandoned?.why} onDone={(why) => setExtra({ abandoned: why ? { why, at: new Date().toISOString() } : undefined })} />}
    </div>
  );
}
function VoiceDraft({ onInsert, onTitle, hasTitle }: { onInsert: (html: string) => void; onTitle: (t: string) => void; hasTitle: boolean }) {
  const [raw, setRaw] = useState(''); const [doubts, setDoubts] = useState<string[]>([]); const [pending, start] = useTransition();
  return (
    <details className="rh-voice"><summary>🚶 Bozza parlata camminando</summary>
      <p className="help">Detta a ruota libera (o incolla una trascrizione): ne esce una bozza ordinata, senza «ehm», con i dubbi segnati [?]. Nessun fatto aggiunto.</p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><DictateButton onText={(t) => setRaw((x) => (x ? x + ' ' : '') + t)} /><span className="help">{raw.split(/\s+/).filter(Boolean).length} parole</span></div>
      <textarea className="textarea" style={{ minHeight: 90, marginTop: 6 }} aria-label="Appunto vocale trascritto" value={raw} onChange={(e) => setRaw(e.target.value)} />
      <button type="button" className="btn btn-outline btn-sm" disabled={pending || raw.trim().split(/\s+/).length < 30} onClick={() => start(async () => { const r = await structureDictationAction(raw); if (!r.ok || !r.data) { toast.error(r.message ?? 'Errore'); return; } onInsert(r.data.html); if (!hasTitle && r.data.title) onTitle(r.data.title); setDoubts(r.data.doubts ?? []); setRaw(''); toast.success('Bozza inserita nel testo.'); })}>{pending ? 'Metto in ordine…' : 'Metti in ordine e inserisci'}</button>
      {doubts.length > 0 && <ul className="rh-list">{doubts.map((d, i) => <li key={i}><b>Da verificare:</b> {d}</li>)}</ul>}
    </details>
  );
}
function Handoff({ articleId, users }: { articleId: string; users: { id: string; name: string }[] }) {
  const [to, setTo] = useState(''); const [note, setNote] = useState(''); const [audio, setAudio] = useState(''); const [recOn, setRecOn] = useState(false); const [inbox, setInbox] = useState<Awaited<ReturnType<typeof handoffsAction>>>([]); const [pending, start] = useTransition(); const mr = useRef<MediaRecorder | null>(null);
  useEffect(() => { handoffsAction(articleId).then(setInbox).catch(() => {}); }, [articleId]);
  const record = async () => {
    if (recOn) { mr.current?.stop(); return; }
    try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const r = new MediaRecorder(stream, { audioBitsPerSecond: 24_000 }); const chunks: Blob[] = []; r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setRecOn(false); const fr = new FileReader(); fr.onload = () => setAudio(String(fr.result)); fr.readAsDataURL(new Blob(chunks, { type: r.mimeType || 'audio/webm' })); };
      mr.current = r; r.start(); setRecOn(true); setTimeout(() => { if (r.state === 'recording') r.stop(); }, 60_000);
    } catch { toast.error('Microfono non disponibile.'); }
  };
  if (users.length === 0 && inbox.length === 0) return null;
  return (
    <><div className="panel-title" style={{ marginTop: 16 }}>Staffetta</div>
      {inbox.map((h) => <div key={h.id} className="handoff-note"><b>{h.fromName}</b> ti ha passato il pezzo il {new Date(h.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}{h.note && <p>{h.note}</p>}{h.audio && <audio controls preload="none" src={h.audio} />}</div>)}
      {users.length > 0 && <><select className="select" aria-label="Passa il pezzo a" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Passa il pezzo a…</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <textarea className="textarea" style={{ minHeight: 56, marginTop: 6 }} placeholder="Biglietto: dove sei arrivato, cosa manca, chi richiamare" aria-label="Biglietto" value={note} onChange={(e) => setNote(e.target.value)} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}><button type="button" className={`btn btn-sm ${recOn ? 'btn-danger' : 'btn-ghost'}`} onClick={record}>{recOn ? '⏹ Ferma (max 1 min)' : audio ? '🎙 Registra di nuovo' : '🎙 Biglietto vocale'}</button>{audio && !recOn && <audio controls src={audio} style={{ height: 32 }} />}
          <button type="button" className="btn btn-outline btn-sm" disabled={pending || !to} onClick={() => start(async () => { const r = await handoffAction(articleId, to, note, audio); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) { setNote(''); setAudio(''); setTo(''); } })}>Passa il pezzo</button></div></>}
    </>
  );
}
function Abandon({ id, abandoned, onDone }: { id: string; abandoned?: string; onDone: (why: string) => void }) {
  const [why, setWhy] = useState(''); const [pending, start] = useTransition();
  return <><div className="panel-title" style={{ marginTop: 16 }}>Mettere da parte</div>{abandoned ? <p className="help">Bozza nel cimitero delle bozze: «{abandoned}». <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { const r = await abandonDraftAction(id, ''); if (r.ok) onDone(''); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Ripesca</button></p> : <div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="Perché la lasci? (es. fonte non risponde, superata dai fatti)" aria-label="Perché lasci questa bozza" value={why} onChange={(e) => setWhy(e.target.value)} /><button type="button" className="btn btn-ghost btn-sm" disabled={pending || why.trim().length < 4} onClick={() => start(async () => { const r = await abandonDraftAction(id, why); if (r.ok) onDone(why); (r.ok ? toast.success : toast.error)(r.message ?? ''); })}>Abbandona</button></div>}</>;
}
