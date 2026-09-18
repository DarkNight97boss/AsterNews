'use client';
import { useState, useTransition } from 'react';
import { toast } from '@/components/ui/toaster';
import type { Article, ArticleKindLabel, VerificationState } from '@/lib/models';
import { KIND_LABELS, VERIFY_LABELS } from '@/lib/trust';
import { addCommitmentAction } from '@/lib/actions-trust';
import { altVersionAction } from '@/lib/actions-reading';

type Extra = NonNullable<Article['extra']>;
/** Pannello «Fiducia» dell'editor: etichetta dell'articolo, stato di verifica, domande aperte, conflitti, promesse e previsioni. */
export function ReaderEditor({ title, content, extra, setExtra }: { title: string; content: string; extra: Extra; setExtra: (p: Partial<Extra>) => void }) {
  const [busy, setBusy] = useState(''); const [, start] = useTransition();
  const gen = (kind: 'kids' | 'easy') => { setBusy(kind); start(async () => { const r = await altVersionAction(kind, title, content); setBusy(''); if (r.ok && r.data) { setExtra({ versions: { ...(extra.versions ?? {}), [kind]: r.data } }); toast.success('Versione pronta: rileggila prima di pubblicare.'); } else toast.error(r.message ?? 'Errore'); }); };
  return (
    <div className="panel"><div className="panel-title">Per chi legge</div>
      <div className="field"><label htmlFor="rd-mind">«Ho cambiato idea»: la domanda a cui il lettore risponde prima e dopo</label><input id="rd-mind" className="input" placeholder="es. La tangenziale va costruita?" value={extra.mindQuestion ?? ''} onChange={(e) => setExtra({ mindQuestion: e.target.value || undefined })} /></div>
      <label className="switch"><input type="checkbox" checked={!!extra.sealed} onChange={(e) => setExtra({ sealed: e.target.checked || undefined })} /> Lettera al futuro: se è programmata, il titolo compare sigillato in «Lettere al futuro» fino al giorno dell&apos;uscita</label>
      <label className="switch" style={{ margin: '6px 0 10px' }}><input type="checkbox" checked={!!extra.notebook} onChange={(e) => setExtra({ notebook: e.target.checked || undefined })} /> Mostra questa bozza nel «Quaderno» pubblico (solo titolo, sommario e avanzamento)</label>
      <div className="field"><label htmlFor="rd-amb">Suono d&apos;ambiente (URL di un mp3 registrato sul posto)</label><input id="rd-amb" className="input" placeholder="https://…/mercato.mp3" value={extra.ambientUrl ?? ''} onChange={(e) => setExtra({ ambientUrl: e.target.value || undefined })} /></div>
      {(['kids', 'easy'] as const).map((k) => { const v = extra.versions?.[k]; return <div className="field" key={k}><label htmlFor={`rd-${k}`}>{k === 'kids' ? 'Versione per bambini' : 'Versione in lingua facile'} <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => gen(k)}>{busy === k ? 'Preparo…' : v ? 'Rigenera' : 'Prepara con l\'AI'}</button>{v && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExtra({ versions: { ...(extra.versions ?? {}), [k]: undefined } })}>Rimuovi</button>}</label>{v && <><textarea id={`rd-${k}`} className="textarea" style={{ minHeight: 120, fontSize: 13 }} value={v.html} onChange={(e) => setExtra({ versions: { ...(extra.versions ?? {}), [k]: { ...v, html: e.target.value } } })} /><p className="help">Glossario: {v.glossary.map((g) => g.term).join(', ') || 'nessuna parola'}. Rileggi e correggi: esce con la firma della redazione.</p></>}</div>; })}
    </div>
  );
}
export function TrustEditor({ articleId, isNew, extra, setExtra }: { articleId: string; isNew: boolean; extra: Extra; setExtra: (p: Partial<Extra>) => void }) {
  const [c, setC] = useState({ kind: 'promise' as 'promise' | 'prediction', text: '', who: '', due: '' }); const [pending, start] = useTransition();
  return (
    <div className="panel"><div className="panel-title">Fiducia e trasparenza</div>
      <div className="form-row">
        <div className="field"><label htmlFor="tr-kind">Che cos&apos;è questo testo</label><select id="tr-kind" className="select" value={extra.label?.kind ?? ''} onChange={(e) => setExtra({ label: e.target.value ? { ...(extra.label ?? {}), kind: e.target.value as ArticleKindLabel } : undefined })}><option value="">Nessuna etichetta</option>{(Object.keys(KIND_LABELS) as ArticleKindLabel[]).map((k) => <option key={k} value={k}>{KIND_LABELS[k].name}</option>)}</select></div>
        <div className="field"><label htmlFor="tr-ver">Stato di verifica</label><select id="tr-ver" className="select" value={extra.verification?.state ?? ''} onChange={(e) => setExtra({ verification: e.target.value ? { state: e.target.value as VerificationState, note: extra.verification?.note, at: new Date().toISOString() } : undefined })}><option value="">Non mostrare</option>{(Object.keys(VERIFY_LABELS) as VerificationState[]).map((k) => <option key={k} value={k}>{VERIFY_LABELS[k].name}</option>)}</select></div>
      </div>
      {extra.label?.kind && <div className="form-row"><label className="switch"><input type="checkbox" checked={!!extra.label.onSite} onChange={(e) => setExtra({ label: { ...extra.label, onSite: e.target.checked } })} /> Eravamo sul posto</label><div className="field"><label htmlFor="tr-docs">Documenti letti</label><input id="tr-docs" className="input" type="number" min={0} value={extra.label.docs ?? 0} onChange={(e) => setExtra({ label: { ...extra.label, docs: Math.max(0, Number(e.target.value) || 0) } })} /></div></div>}
      {extra.label?.kind && <p className="help">L&apos;etichetta pubblica conta da sola fonti, versioni, giorni di lavoro, uso dell&apos;AI e correzioni.</p>}
      {extra.verification?.state && <div className="field"><label htmlFor="tr-vnote">Nota sullo stato (facoltativa)</label><input id="tr-vnote" className="input" value={extra.verification.note ?? ''} placeholder="es. in attesa della conferma della Questura" onChange={(e) => setExtra({ verification: { ...extra.verification!, note: e.target.value || undefined } })} /></div>}
      <div className="field"><label htmlFor="tr-open">Cosa non sappiamo ancora (una domanda per riga)</label><textarea id="tr-open" className="textarea" style={{ minHeight: 60 }} value={(extra.openQuestions ?? []).join('\n')} onChange={(e) => { const q = e.target.value.split('\n'); setExtra({ openQuestions: q.some((x) => x.trim()) ? q : undefined }); }} onBlur={() => setExtra({ openQuestions: (extra.openQuestions ?? []).map((x) => x.trim()).filter(Boolean).slice(0, 12) })} /></div>
      <div className="field"><label htmlFor="tr-conf">Conflitto di interessi da dichiarare su questo articolo</label><input id="tr-conf" className="input" value={extra.conflict ?? ''} placeholder="es. l'autore è socio dell'associazione citata" onChange={(e) => setExtra({ conflict: e.target.value || undefined })} /></div>
      <div className="field"><label>Promessa ai lettori o previsione da verificare</label>
        {isNew ? <p className="help">Salva l&apos;articolo per registrarne una.</p> : <>
          <div className="form-row"><select className="select" aria-label="Tipo" value={c.kind} onChange={(e) => setC({ ...c, kind: e.target.value as 'promise' | 'prediction' })}><option value="promise">Promessa nostra</option><option value="prediction">Previsione di qualcuno</option></select><input className="input" type="date" aria-label="Scadenza" value={c.due} onChange={(e) => setC({ ...c, due: e.target.value })} /></div>
          {c.kind === 'prediction' && <input className="input" style={{ marginTop: 6 }} placeholder="Chi la fa (es. l'assessore Rossi)" aria-label="Chi fa la previsione" value={c.who} onChange={(e) => setC({ ...c, who: e.target.value })} />}
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><input className="input" placeholder={c.kind === 'promise' ? 'es. Aggiorneremo l\'articolo quando esce la sentenza' : 'es. Il cantiere chiuderà entro giugno'} aria-label="Testo" value={c.text} onChange={(e) => setC({ ...c, text: e.target.value })} /><button type="button" className="btn btn-outline btn-sm" disabled={pending || !c.text.trim() || !c.due} onClick={() => start(async () => { const r = await addCommitmentAction(c.kind, articleId, c.text, c.due, c.who); (r.ok ? toast.success : toast.error)(r.message ?? ''); if (r.ok) setC({ ...c, text: '', who: '' }); })}>Registra</button></div>
          <p className="help">Alla scadenza compare in «Fiducia» e ti arriva una notifica. L&apos;esito resta visibile ai lettori.</p></>}
      </div>
    </div>
  );
}
