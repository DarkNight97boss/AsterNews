'use client';
import { useState, useTransition } from 'react';
import { toast } from '@/components/ui/toaster';
import type { Article, ArticleOutputs } from '@/lib/models';
import { dialogueAudioAction, dialogueScriptAction, outputsAction } from '@/lib/actions-outputs';

type Extra = NonNullable<Article['extra']>;
const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success('Copiato.')).catch(() => {});
/** Un contenuto, dieci uscite: le versioni per gli altri canali nascono dall'articolo e sanno quando l'articolo è cambiato. */
export function OutputsPanel({ article: a, isNew, siteUrl, stale, extra, setExtra }: { article: Article; isNew: boolean; siteUrl: string; stale: boolean; extra: Extra; setExtra: (p: Partial<Extra>) => void }) {
  const [busy, setBusy] = useState(''); const [, start] = useTransition(); const o = extra.outputs; const set = (p: Partial<ArticleOutputs>) => o && setExtra({ outputs: { ...o, ...p } });
  const gen = () => { setBusy('out'); start(async () => { const r = await outputsAction(a.title, a.content, siteUrl); setBusy(''); if (r.ok && r.data) { setExtra({ outputs: { ...r.data, dialogue: o?.dialogue, dialogueUrl: o?.dialogueUrl } }); toast.success('Uscite pronte: rileggile prima di usarle.'); } else toast.error(r.message ?? ''); }); };
  const Block = ({ title, text }: { title: string; text: string }) => text ? <details className="out-block"><summary>{title} <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.preventDefault(); copy(text); }}>Copia</button></summary><pre>{text}</pre></details> : null;
  return (
    <div className="panel outputs"><div className="panel-title">Un contenuto, dieci uscite</div>
      {o && stale && <p className="form-error" role="alert">Il testo è cambiato dopo che hai preparato le uscite (una correzione?): rigenerale, così l&apos;errore non resta in giro.</p>}
      <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={gen}>{busy === 'out' ? 'Preparo…' : o ? 'Rigenera dalle ultime modifiche' : 'Prepara thread, carosello, video, newsletter, SMS'}</button>
      {o && <><Block title={`Thread (${o.thread.length} post)`} text={o.thread.map((t, i) => `${i + 1}/ ${t}`).join('\n\n')} /><Block title={`Carosello (${o.carousel.length} slide)`} text={o.carousel.map((t, i) => `[${i + 1}] ${t}`).join('\n')} /><Block title="Script video verticale" text={o.video} /><Block title="Paragrafi per la newsletter" text={o.newsletter} /><Block title="Canale WhatsApp" text={o.whatsapp} />
        <div className="field" style={{ marginTop: 8 }}><label htmlFor="out-sms">SMS ({o.sms.length}/250) {!isNew && <a href={`/breve/${a.id}`} target="_blank" className="help">apri la pagina «in breve»</a>}</label><textarea id="out-sms" className="textarea" style={{ minHeight: 56 }} maxLength={250} value={o.sms} onChange={(e) => set({ sms: e.target.value })} /></div></>}
      <div className="panel-title" style={{ marginTop: 14 }}>Podcast a due voci sintetiche</div><p className="help">Un dialogo tratto dal pezzo, dichiarato come sintetico nella prima battuta. Prima il copione, che puoi correggere, poi l&apos;audio.</p>
      <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => { setBusy('dlg'); start(async () => { const r = await dialogueScriptAction(a.title, a.content); setBusy(''); if (r.ok && r.data) setExtra({ outputs: { ...(o ?? { hash: '', at: '', thread: [], carousel: [], video: '', newsletter: '', sms: '', whatsapp: '' }), dialogue: r.data } }); else toast.error(r.message ?? ''); }); }}>{busy === 'dlg' ? 'Scrivo il copione…' : o?.dialogue ? 'Riscrivi il copione' : 'Scrivi il copione'}</button>
      {o?.dialogue && <><div className="dialogue">{o.dialogue.map((l, i) => <div key={i} className={`dl dl-${l.who}`}><b>{l.who}</b><textarea aria-label={`Battuta ${i + 1}, voce ${l.who}`} value={l.text} onChange={(e) => set({ dialogue: o.dialogue!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} /></div>)}</div>
        {!isNew && <button type="button" className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => { setBusy('aud'); start(async () => { const r = await dialogueAudioAction(a.id, o.dialogue!); setBusy(''); if (r.ok && r.url) { set({ dialogueUrl: r.url }); toast.success(r.message ?? ''); } else toast.error(r.message ?? ''); }); }}>{busy === 'aud' ? 'Registro le voci… (qualche minuto)' : 'Genera l\'audio'}</button>}{o.dialogueUrl && <audio controls preload="none" src={o.dialogueUrl} style={{ width: '100%', marginTop: 8 }} />}</>}
    </div>
  );
}
