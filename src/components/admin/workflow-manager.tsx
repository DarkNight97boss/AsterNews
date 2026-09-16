'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveWorkflowAction } from '@/lib/actions-workflow';
import type { Article, Category, Tag, User, WorkflowRule, WorkflowSettings } from '@/lib/models';
import { FORMAT_LABELS } from '@/lib/models';
import { uid } from '@/lib/utils';
import { toast } from '@/components/ui/toaster';

const NETS = ['facebook', 'x', 'telegram', 'webhook'];
/** Desk (cronaca, sport…) con code di revisione, fasi di approvazione e regole automatiche «se… allora…». */
export function WorkflowManager({ initial, categories, users, tags, queues }: { initial: WorkflowSettings; categories: Category[]; users: User[]; tags: Tag[]; queues: { desk: string; articles: Article[] }[] }) {
  const router = useRouter(); const [w, setW] = useState(initial); const [pending, start] = useTransition();
  const setDesk = (i: number, patch: Partial<WorkflowSettings['desks'][number]>) => setW({ ...w, desks: w.desks.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const setRule = (i: number, patch: Partial<WorkflowRule>) => setW({ ...w, rules: w.rules.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <>
      <div className="page-title"><div><h1>Desk e flussi di lavoro</h1><p>Squadre con code di revisione separate, approvazione a più passi e automatismi alla pubblicazione.</p></div><div className="actions"><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveWorkflowAction(w); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva</button></div></div>
      {queues.length > 0 && <div className="panel"><div className="panel-title">Code di revisione per desk</div><div className="admin-grid-2">{queues.map((q) => <div key={q.desk}><b>{q.desk}</b> <span className="help">· {q.articles.length} in revisione</span><ul className="activity">{q.articles.slice(0, 8).map((a) => <li key={a.id}><span>⏳</span><div><Link href={`/admin/articoli/${a.id}`}>{a.title || '(senza titolo)'}</Link><div className="help">fase {(a.extra?.stage ?? 0) + 1}: {w.steps[a.extra?.stage ?? 0] ?? 'pronto'}</div></div></li>)}{q.articles.length === 0 && <li className="help">Nessun articolo in coda.</li>}</ul></div>)}</div></div>}
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Desk <button className="btn btn-outline btn-sm" onClick={() => setW({ ...w, desks: [...w.desks, { id: uid('dk'), name: '', categoryIds: [], userIds: [] }] })}>+ Desk</button></div>
          {w.desks.map((d, i) => <div key={d.id} className="desk-card"><div style={{ display: 'flex', gap: 6 }}><input className="input" placeholder="Nome del desk (es. Cronaca)" value={d.name} onChange={(e) => setDesk(i, { name: e.target.value })} /><button className="icon-btn danger" onClick={() => setW({ ...w, desks: w.desks.filter((_, j) => j !== i) })}>✕</button></div>
            <div className="help" style={{ margin: '6px 0 2px' }}>Categorie</div><div className="chips">{categories.map((c) => <button key={c.id} type="button" className="chip chip-btn" style={d.categoryIds.includes(c.id) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => setDesk(i, { categoryIds: toggle(d.categoryIds, c.id) })}>{c.name}</button>)}</div>
            <div className="help" style={{ margin: '6px 0 2px' }}>Membri</div><div className="chips">{users.filter((u) => u.active).map((u) => <button key={u.id} type="button" className="chip chip-btn" style={d.userIds.includes(u.id) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => setDesk(i, { userIds: toggle(d.userIds, u.id) })}>{u.name}</button>)}</div>
          </div>)}
          {w.desks.length === 0 && <p className="help">Nessun desk: la revisione è unica per tutta la redazione.</p>}
        </div>
        <div className="panel"><div className="panel-title">Fasi di approvazione</div>
          <p className="help" style={{ marginBottom: 8 }}>Prima della pubblicazione l&apos;articolo passa queste fasi in ordine (vuoto = nessun vincolo). Chi approva: fase «desk» i membri del desk o il caporedattore; «legale» solo l&apos;amministratore; le altre il caporedattore.</p>
          <input className="input" value={w.steps.join(' → ')} onChange={(e) => setW({ ...w, steps: e.target.value.split('→').map((x) => x.trim()).filter(Boolean) })} placeholder="desk → caporedattore → legale" />
          <div className="chips" style={{ marginTop: 8 }}>{['desk', 'caporedattore', 'legale', 'fact-checking'].map((p) => <button key={p} type="button" className="chip chip-btn" onClick={() => !w.steps.includes(p) && setW({ ...w, steps: [...w.steps, p] })}>+ {p}</button>)}</div>
        </div>
      </div>
      <div className="panel"><div className="panel-title">Regole automatiche alla pubblicazione <button className="btn btn-outline btn-sm" onClick={() => setW({ ...w, rules: [...w.rules, { id: uid('rl'), name: '', enabled: true, if: {}, then: {} }] })}>+ Regola</button></div>
        {w.rules.map((r, i) => <div key={r.id} className="rule-card">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input className="input" placeholder="Nome regola (es. Sport con video in home)" value={r.name} onChange={(e) => setRule(i, { name: e.target.value })} /><label className="switch"><input type="checkbox" checked={r.enabled} onChange={(e) => setRule(i, { enabled: e.target.checked })} /> attiva</label><button className="icon-btn danger" onClick={() => setW({ ...w, rules: w.rules.filter((_, j) => j !== i) })}>✕</button></div>
          <div className="rule-row"><b>SE</b><select className="select" value={r.if.categoryId ?? ''} onChange={(e) => setRule(i, { if: { ...r.if, categoryId: e.target.value || undefined } })}><option value="">qualsiasi categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="select" value={r.if.format ?? ''} onChange={(e) => setRule(i, { if: { ...r.if, format: (e.target.value || undefined) as Article['format'] | undefined } })}><option value="">qualsiasi formato</option>{(Object.keys(FORMAT_LABELS) as Article['format'][]).map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}</select><select className="select" value={r.if.tagId ?? ''} onChange={(e) => setRule(i, { if: { ...r.if, tagId: e.target.value || undefined } })}><option value="">qualsiasi tag</option>{tags.slice(0, 200).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><label className="switch"><input type="checkbox" checked={!!r.if.hasVideo} onChange={(e) => setRule(i, { if: { ...r.if, hasVideo: e.target.checked || undefined } })} /> ha un video</label><input className="input" style={{ maxWidth: 200 }} placeholder="titolo contiene…" value={r.if.titleContains ?? ''} onChange={(e) => setRule(i, { if: { ...r.if, titleContains: e.target.value || undefined } })} /></div>
          <div className="rule-row"><b>ALLORA</b><label className="switch"><input type="checkbox" checked={!!r.then.featured} onChange={(e) => setRule(i, { then: { ...r.then, featured: e.target.checked || undefined } })} /> in evidenza in home</label><label className="switch"><input type="checkbox" checked={!!r.then.breaking} onChange={(e) => setRule(i, { then: { ...r.then, breaking: e.target.checked || undefined } })} /> ultim&apos;ora (+ push)</label><label className="switch"><input type="checkbox" checked={!!r.then.premium} onChange={(e) => setRule(i, { then: { ...r.then, premium: e.target.checked || undefined } })} /> solo abbonati</label><select className="select" value={r.then.tagId ?? ''} onChange={(e) => setRule(i, { then: { ...r.then, tagId: e.target.value || undefined } })}><option value="">+ nessun tag</option>{tags.slice(0, 200).map((t) => <option key={t.id} value={t.id}>+ tag {t.name}</option>)}</select><span className="help">social:</span>{NETS.map((n) => <label key={n} className="switch"><input type="checkbox" checked={(r.then.social ?? []).includes(n)} onChange={() => setRule(i, { then: { ...r.then, social: toggle(r.then.social ?? [], n) } })} /> {n}</label>)}</div>
        </div>)}
        {w.rules.length === 0 && <p className="help">Nessuna regola. Esempio: «se categoria = Sport e ha un video → in evidenza e post su Telegram».</p>}
      </div>
    </>
  );
}
