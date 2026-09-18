import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings, getUsers } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { listRecords } from '@/lib/records';
import { predictionScore } from '@/lib/trust';
import { publicKeyPem } from '@/lib/signing';

export const metadata: Metadata = { title: 'Trasparenza: chi ci paga e come lavoriamo', description: 'Da dove arrivano i soldi, quali impegni ci siamo presi e come li stiamo rispettando.' };
export const dynamic = 'force-dynamic';
export default async function TransparencyPage() {
  const [s, users, corrected, replies, preds, promises, key] = await Promise.all([getSettings(), getUsers(), listArticles({ status: 'published', extraHas: 'corrections' }, 'updated', 300), listRecords('reply', { limit: 500 }), listRecords<{ outcome?: string }>('prediction', { status: 'done', limit: 500 }), listRecords<{ outcome?: string }>('promise', { status: 'done', limit: 500 }), publicKeyPem().catch(() => '')]);
  const t = s.trust ?? {}; const since = new Date(Date.now() - 90 * 86_400_000).toISOString(); const corr90 = corrected.flatMap((a) => a.extra?.corrections ?? []).filter((c) => c.date >= since).length;
  const score = predictionScore(preds.map((p) => p.data.outcome ?? '')); const kept = promises.filter((p) => p.data.outcome === 'kept').length; const stateLabel = { kept: '✔ rispettato', progress: '… in corso', missed: '✕ non rispettato' } as const;
  const disclosed = users.filter((u) => t.disclosures?.[u.id]);
  return (
    <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Trasparenza</h1><p className="lead">Chi legge ha diritto di sapere chi paga, chi scrive e cosa succede quando sbagliamo.</p>
      <h2>Chi ci paga{t.fundingYear ? ` (${t.fundingYear})` : ''}</h2>
      {(t.funding ?? []).length === 0 ? <p className="help">La redazione non ha ancora pubblicato la ripartizione delle entrate.</p> : <ul className="funding">{t.funding!.map((f, i) => <li key={i}><div className="funding-head"><span>{f.label}</span><b>{f.percent}%</b></div><div className="funding-bar"><span style={{ width: `${f.percent}%` }} /></div>{f.note && <p className="help">{f.note}</p>}</li>)}</ul>}
      <h2>I nostri impegni</h2>
      {(t.commitments ?? []).length === 0 ? <p className="help">Nessun impegno pubblicato.</p> : <ul className="commitments">{t.commitments!.map((c, i) => <li key={i} className={`cm-${c.state}`}><span>{c.text}</span><b>{stateLabel[c.state]}</b>{c.note && <p className="help">{c.note}</p>}</li>)}</ul>}
      <h2>I numeri, misurati dal sistema</h2>
      <dl className="trust-numbers"><div><dt>Correzioni negli ultimi 90 giorni</dt><dd>{corr90} · <Link href="/correzioni">registro</Link></dd></div><div><dt>Richieste di replica ricevute / pubblicate</dt><dd>{replies.length} / {replies.filter((r) => r.status === 'approved').length}</dd></div><div><dt>Promesse ai lettori arrivate a scadenza</dt><dd>{promises.length ? `${kept} mantenute su ${promises.length}` : 'nessuna'}</dd></div><div><dt>Previsioni verificate</dt><dd>{score.percent === null ? 'nessuna' : `${score.percent}% azzeccate su ${score.total}`} · <Link href="/previsioni">archivio</Link></dd></div></dl>
      {disclosed.length > 0 && <><h2>Interessi dichiarati da chi scrive</h2><ul className="trust-list">{disclosed.map((u) => <li key={u.id}><div><Link href={`/autore/${u.id}`}>{u.name}</Link><p>{t.disclosures![u.id]}</p></div></li>)}</ul></>}
      <h2>Articoli firmati</h2><p>Ogni articolo pubblicato porta una firma digitale: chiunque può controllare che il testo che sta leggendo, anche copiato altrove, sia quello uscito dalla redazione. In fondo a ogni articolo trovi «verifica l&apos;autenticità».</p>
      {key && <details><summary>Chiave pubblica della testata (Ed25519)</summary><pre className="pubkey">{key}</pre></details>}
      <p className="help">Vedi anche: <Link href="/domande-aperte">domande aperte</Link> · <Link href="/attenzione">il tuo bilancio dell&apos;attenzione</Link></p>
    </div></div>
  );
}
