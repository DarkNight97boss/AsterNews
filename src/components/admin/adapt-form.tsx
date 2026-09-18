'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveAdaptAction } from '@/lib/actions-system';
import { NAV, PROFILES, arrangeNav, vocabularyOf, type AdaptSettings } from '@/lib/admin-nav';
import { toast } from '@/components/ui/toaster';

/** «Adatta il CMS»: profilo d'uso, menu che si restringe da solo, modalità solista, vocabolario. Con anteprima immediata del menu. */
export function AdaptForm({ initial, solo, used, items }: { initial: AdaptSettings; solo: boolean; used: string[]; items: { href: string; label: string; icon: string; core: boolean }[] }) {
  const router = useRouter(); const [a, setA] = useState<AdaptSettings>(initial); const [pending, start] = useTransition();
  const preview = arrangeNav(NAV, a, { solo, used, mature: true }); const voc = vocabularyOf(a); const base = PROFILES.find((p) => p.id === a.profile)!.nouns;
  const togglePin = (h: string) => setA({ ...a, pinned: (a.pinned ?? []).includes(h) ? (a.pinned ?? []).filter((x) => x !== h) : [...(a.pinned ?? []), h] });
  return (
    <>
      <div className="page-title"><div><h1>Adatta il CMS</h1><p>Lo stesso motore serve un quotidiano e un blog personale: qui scegli che forma deve avere. Nulla viene cancellato, le voci che non servono scendono in «Altro».</p></div><div className="actions"><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveAdaptAction(a); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); })}>Salva e applica</button></div></div>
      <div className="panel"><div className="panel-title">Che cos&apos;è questo sito?</div><div className="profile-grid">{PROFILES.map((p) => <button key={p.id} type="button" className={`profile-card ${a.profile === p.id ? 'on' : ''}`} onClick={() => setA({ ...a, profile: p.id })}><b>{p.name}</b><span>{p.description}</span><em>si parla di «{p.nouns.articles}»</em></button>)}</div></div>
      <div className="admin-grid-2">
        <div>
          <div className="panel"><div className="panel-title">Comportamento</div>
            <label className="switch"><input type="checkbox" checked={a.autoHide} onChange={(e) => setA({ ...a, autoHide: e.target.checked })} /> Sposta in «Altro» le voci che non apro da 30 giorni (dopo le prime due settimane d&apos;uso)</label>
            <br /><label className="switch" style={{ marginTop: 8 }}><input type="checkbox" checked={a.blackBox !== false} onChange={(e) => setA({ ...a, blackBox: e.target.checked })} /> Mostra sotto gli articoli «Come è nato questo articolo» (versioni, fonti, uso dell&apos;AI)</label>
            <p className="help" style={{ marginTop: 8 }}>{solo ? 'Modalità solista attiva: sei l\'unica persona, quindi desk, scaletta e registro attività stanno in «Altro». Tornano da soli quando inviti qualcuno.' : 'Siete in più persone: gli strumenti di squadra restano in primo piano.'}</p>
          </div>
          <div className="panel"><div className="panel-title">Le parole del tuo sito</div><p className="help" style={{ marginBottom: 8 }}>Vuote = quelle del profilo. Cambiano nel menu e nei pulsanti.</p>
            <div className="form-row">{(['article', 'articles', 'write', 'site', 'team'] as const).map((k) => <div className="field" key={k}><label>{{ article: 'Un contenuto si chiama', articles: 'Al plurale', write: 'Pulsante per scrivere', site: 'Il sito è un/una', team: 'Chi scrive' }[k]}</label><input className="input" placeholder={base[k]} value={a.vocabulary?.[k] ?? ''} onChange={(e) => setA({ ...a, vocabulary: { ...(a.vocabulary ?? {}), [k]: e.target.value } })} /></div>)}</div>
            <p className="help">Esempio: «ricetta / ricette / Nuova ricetta» per un blog di cucina.</p>
          </div>
          <div className="panel"><div className="panel-title">Voci sempre in primo piano</div><div className="chips">{items.filter((i) => !i.core).map((i) => <button key={i.href} type="button" className="chip chip-btn" style={(a.pinned ?? []).includes(i.href) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => togglePin(i.href)}>{i.icon} {i.label}</button>)}</div></div>
        </div>
        <div className="panel"><div className="panel-title">Anteprima del menu <span className="help">({preview.main.length} in primo piano, {preview.more.length} in «Altro»)</span></div>
          <div className="nav-preview"><b>✨ {voc.write}</b>{(['Contenuti', 'Territorio', 'Community', 'Sistema', 'Account'] as const).map((g) => { const l = preview.main.filter((x) => x.group === g); return l.length ? <div key={g}><span className="np-group">{g}</span>{l.map((x) => <span key={x.href} className="np-item">{x.icon} {x.label}</span>)}</div> : null; })}{preview.more.length > 0 && <div><span className="np-group">Altro</span>{preview.more.map((x) => <span key={x.href} className="np-item np-more">{x.icon} {x.label}</span>)}</div>}</div>
          <p className="help">L&apos;anteprima simula il menu dopo un mese d&apos;uso; una voce che apri torna da sola in primo piano.</p>
        </div>
      </div>
    </>
  );
}
