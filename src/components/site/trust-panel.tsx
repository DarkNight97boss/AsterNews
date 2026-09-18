import Link from 'next/link';
import type { Article, SiteSettings, User } from '@/lib/models';
import { VERIFY_LABELS, nutritionLabel } from '@/lib/trust';
import { listRecords } from '@/lib/records';
import { ReplyForm } from './reply-form';

export function VerificationBadge({ a }: { a: Article }) {
  const v = a.extra?.verification; if (!v?.state) return null; const l = VERIFY_LABELS[v.state];
  return <p className={`verify-badge tone-${l.tone}`} title={l.hint}><b>{l.name}</b>{v.note ? ` · ${v.note}` : ` · ${l.hint}`}{v.at && <time dateTime={v.at}> (stato al {new Date(v.at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })})</time>}</p>;
}
/** Tutto ciò che rende l'articolo verificabile dal lettore: etichetta, conflitti d'interesse, cosa non sappiamo, promesse, repliche, firma. */
export async function TrustPanel({ a, author, settings, revisions }: { a: Article; author?: User; settings: SiteSettings; revisions: number }) {
  const label = nutritionLabel(a, revisions); const e = a.extra ?? {}; const trust = settings.trust ?? {};
  const [promises, replies, predictions] = await Promise.all([listRecords<{ text: string; outcome?: string; note?: string }>('promise', { ref: a.id }), listRecords<{ name: string; role: string; text: string }>('reply', { ref: a.id, status: 'approved', order: 'old' }), listRecords<{ text: string; who?: string; outcome?: string; note?: string }>('prediction', { ref: a.id })]);
  const disclosure = [e.conflict, author && !a.byline ? trust.disclosures?.[author.id] : ''].filter(Boolean) as string[];
  const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  return (
    <>
      {(e.openQuestions ?? []).length > 0 && <section className="open-questions" aria-label="Cosa non sappiamo ancora"><b>Cosa non sappiamo ancora</b><ul>{e.openQuestions!.map((q, i) => <li key={i}>{q}</li>)}</ul><Link href="/domande-aperte">Tutte le domande aperte</Link></section>}
      {label && <section className="nutrition" aria-label="Etichetta dell'articolo"><header><b>Etichetta dell&apos;articolo</b><span>{label.kind}</span></header><p className="help">{label.kindHint}</p><dl>
        <div><dt>Fonti consultate</dt><dd>{label.sources}{label.verified > 0 ? ` (${label.verified} verificate direttamente)` : ''}</dd></div>
        {label.docs > 0 && <div><dt>Documenti letti</dt><dd>{label.docs}</dd></div>}
        <div><dt>Sul posto</dt><dd>{label.onSite ? 'sì' : 'no'}</dd></div>
        <div><dt>Lavorazione</dt><dd>{label.days <= 0 ? 'in giornata' : `${label.days} ${label.days === 1 ? 'giorno' : 'giorni'}`}, {label.revisions} versioni</dd></div>
        <div><dt>Strumenti AI</dt><dd>{label.ai ? 'usati come aiuto, testo riletto da una persona' : 'non usati'}</dd></div>
        <div><dt>Correzioni</dt><dd>{label.corrections || 'nessuna'}</dd></div>
        {label.sponsored && <div><dt>Pagato da terzi</dt><dd>sì, contenuto sponsorizzato</dd></div>}
      </dl></section>}
      {disclosure.length > 0 && <section className="disclosure" aria-label="Conflitti di interesse"><b>Interessi dichiarati</b>{disclosure.map((d, i) => <p key={i}>{d}</p>)}</section>}
      {promises.length > 0 && <section className="promises" aria-label="Impegni con i lettori"><b>Ci siamo impegnati a</b><ul>{promises.map((p) => <li key={p.id} className={p.status === 'done' ? `pr-${p.data.outcome}` : ''}>{p.data.text} <span className="help">{p.status === 'done' ? (p.data.outcome === 'kept' ? `✔ fatto${p.data.note ? `: ${p.data.note}` : ''}` : `✕ non mantenuto${p.data.note ? `: ${p.data.note}` : ''}`) : `entro il ${day(p.dueAt)}`}</span></li>)}</ul></section>}
      {predictions.length > 0 && <section className="promises" aria-label="Previsioni"><b>Previsioni contenute in questo articolo</b><ul>{predictions.map((p) => <li key={p.id}>{p.data.who ? `${p.data.who}: ` : ''}«{p.data.text}» <span className="help">{p.status === 'done' ? ({ right: '✔ si è avverata', partial: '≈ in parte', wrong: '✕ non si è avverata' } as Record<string, string>)[p.data.outcome ?? ''] : `verifica il ${day(p.dueAt)}`}</span></li>)}</ul><Link href="/previsioni">Archivio delle previsioni</Link></section>}
      {replies.map((r) => <section key={r.id} className="reply-box" aria-label="Diritto di replica"><b>Replica di {r.data.name}{r.data.role ? `, ${r.data.role}` : ''}</b><p>{r.data.text}</p></section>)}
      {trust.replyEnabled !== false && <ReplyForm articleId={a.id} />}
      {e.signature && <p className="signature-line">🔏 Testo firmato dalla testata il {day(e.signature.at)} · impronta <code>{e.signature.hash.slice(0, 12)}…</code> · <a href={`/api/verify/${a.id}`} rel="nofollow">verifica l&apos;autenticità</a></p>}
    </>
  );
}
