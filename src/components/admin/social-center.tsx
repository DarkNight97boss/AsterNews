'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteSocialAction, retrySocialAction, runSocialQueueAction, shareArticleAction, suggestSocialAction } from '@/lib/actions-social';
import { aiSocialAction } from '@/lib/actions-ai';
import type { SocialNetwork, SocialPost } from '@/lib/models';
import { formatDate, toLocalInput } from '@/lib/utils';
import { ActionButton } from '@/components/ui/action-button';
import { toast } from '@/components/ui/toaster';

const LABEL: Record<SocialNetwork, string> = { facebook: 'Facebook', telegram: 'Telegram', x: 'X', webhook: 'Webhook' };
const STATUS: Record<SocialPost['status'], { l: string; c: string }> = { queued: { l: 'In coda', c: 'badge-gray' }, sent: { l: 'Inviato', c: 'badge-green' }, failed: { l: 'Fallito', c: 'badge-red' }, cancelled: { l: 'Annullato', c: 'badge-gray' } };

export function SocialCenter({ posts, recent, networks, auto, bestHour }: { posts: SocialPost[]; recent: { id: string; title: string; category: string }[]; networks: SocialNetwork[]; auto: SocialNetwork[]; bestHour: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [articleId, setArticleId] = useState(recent[0]?.id ?? '');
  const [chosen, setChosen] = useState<SocialNetwork[]>(networks);
  const [text, setText] = useState(''); const [when, setWhen] = useState('');
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => start(async () => { const r = await fn(); (r.ok ? toast.success : toast.error)(r.message ?? ''); router.refresh(); });
  const suggest = () => start(async () => { const s = await suggestSocialAction(articleId, chosen[0] ?? 'facebook'); if (s) setText(s.text); });
  const suggestAi = () => start(async () => { const s = await suggestSocialAction(articleId, 'facebook'); const a = recent.find((r) => r.id === articleId); if (!s || !a) return; const r = await aiSocialAction(a.title, '', s.url); if (!r.ok || !r.data) { toast.error(r.message ?? 'Errore'); return; } setText(`${r.data.facebook}\n${s.url}\n${r.data.hashtags.map((h) => '#' + h).join(' ')}`); });
  return (
    <>
      <div className="page-title"><div><h1>Social</h1><p>Reti configurate: {networks.length ? networks.map((n) => LABEL[n]).join(', ') : 'nessuna'} · pubblicazione automatica: {auto.length ? auto.map((n) => LABEL[n]).join(', ') : 'spenta'}{bestHour !== null && ` · ora migliore secondo le letture: ${bestHour}:00`}. <Link href="/admin/impostazioni">Impostazioni → Social</Link></p></div><div className="actions"><ActionButton className="btn btn-outline" action={() => runSocialQueueAction()}>Invia la coda adesso</ActionButton></div></div>
      <div className="admin-grid-2">
        <div className="panel"><div className="panel-title">Condividi un articolo</div>
          <div className="field"><label>Articolo</label><select className="select" value={articleId} onChange={(e) => { setArticleId(e.target.value); setText(''); }}>{recent.map((a) => <option key={a.id} value={a.id}>{a.title} · {a.category}</option>)}</select></div>
          <div className="field"><label>Reti</label><div className="chips">{networks.map((n) => <button key={n} type="button" className="chip" style={chosen.includes(n) ? { background: 'var(--black)', color: '#fff' } : undefined} onClick={() => setChosen(chosen.includes(n) ? chosen.filter((x) => x !== n) : [...chosen, n])}>{LABEL[n]}</button>)}{networks.length === 0 && <span className="help">Configura almeno una rete nelle Impostazioni.</span>}</div></div>
          <div className="field"><label>Testo <button type="button" className="btn btn-ghost btn-sm" onClick={suggest} disabled={pending || !articleId}>Proponi dal template</button> <button type="button" className="btn btn-ghost btn-sm" onClick={suggestAi} disabled={pending || !articleId}>✨ Proponi con AI</button></label><textarea className="textarea" style={{ minHeight: 110 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Vuoto = testo automatico dal template" /><div className="help">{text.length} caratteri{text.length > 280 && chosen.includes('x') ? ' · su X verrà accorciato' : ''}</div></div>
          <div className="form-row" style={{ alignItems: 'end' }}><div className="field"><label>Quando</label><input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /><div className="help">Vuoto = subito.{bestHour !== null && <> <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); d.setHours(bestHour, 0, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); setWhen(toLocalInput(d.toISOString())); }}>Usa l&apos;ora migliore ({bestHour}:00)</button></>}</div></div><div className="field"><button className="btn btn-primary" disabled={pending || !articleId || !chosen.length} onClick={() => run(() => shareArticleAction(articleId, chosen, text, when ? new Date(when).toISOString() : null))}>{when ? 'Programma' : 'Pubblica ora'}</button></div></div>
        </div>
        <div className="panel"><div className="panel-title">Coda e storico</div>
          <div className="table-wrap" style={{ border: 0, maxHeight: 560, overflow: 'auto' }}><table className="table"><thead><tr><th>Rete</th><th>Testo</th><th>Quando</th><th>Esito</th><th></th></tr></thead><tbody>
            {posts.map((p) => <tr key={p.id}><td>{LABEL[p.network]}</td><td className="help" style={{ maxWidth: 260 }}>{p.text.slice(0, 120)}</td><td className="help" style={{ whiteSpace: 'nowrap' }}>{p.sentAt ? formatDate(p.sentAt) : p.scheduledAt ? `prog. ${formatDate(p.scheduledAt)}` : formatDate(p.createdAt)}</td><td><span className={`badge ${STATUS[p.status].c}`} title={p.result}>{STATUS[p.status].l}</span>{p.status === 'failed' && <div className="help" style={{ maxWidth: 160 }}>{p.result.slice(0, 80)}</div>}</td><td><div className="t-actions">{p.status === 'failed' && <button className="btn btn-outline btn-sm" onClick={() => run(() => retrySocialAction(p.id))}>Riprova</button>}<ActionButton className="icon-btn danger" action={() => deleteSocialAction(p.id)}>✕</ActionButton></div></td></tr>)}
            {posts.length === 0 && <tr><td colSpan={5} className="help">Nessuna condivisione ancora.</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </>
  );
}
