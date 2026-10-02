import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/queries';
import { listCards } from '@/lib/civic-data';
import { councilMatrix } from '@/lib/civic';

export const metadata: Metadata = { title: 'Il consiglio comunale, spiegato', description: 'L\'ordine del giorno in italiano semplice, le delibere con i voti nominali, chi ha votato cosa.' };
export const dynamic = 'force-dynamic';
export default async function CouncilPage() {
  const [s, odg, delibere] = await Promise.all([getSettings(), listCards('odg'), listCards('delibera')]); const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const sedute = [...new Set(odg.map((o) => o.fields.seduta).filter(Boolean))].sort().reverse(); const dl = [...delibere].sort((a, b) => (b.fields.data ?? '').localeCompare(a.fields.data ?? '')); const m = councilMatrix(dl.filter((d) => d.fields.voti).map((d) => ({ id: d.id, title: d.fields.numero ? `n. ${d.fields.numero}` : d.title, votes: d.fields.voti })));
  const sym: Record<string, string> = { favorevole: '✔', contrario: '✕', astenuto: '○', assente: '–' };
  return (
    <div className="account" style={{ maxWidth: 940 }}><div className="account-card trust-page"><h1>Il consiglio comunale, spiegato</h1><p className="lead">Cosa si decide, detto in parole semplici, e chi ha alzato la mano.{s.civic?.councilUrl && <> Le sedute si seguono <a href={s.civic.councilUrl} rel="noopener" target="_blank">in diretta qui</a>.</>}</p>
      <h2>Ordine del giorno, tradotto</h2>{sedute.length === 0 && <p className="help">Nessuna seduta tradotta per ora.</p>}{sedute.map((d) => <section key={d}><h3>Seduta del {day(d)}</h3><ol className="odg">{odg.filter((o) => o.fields.seduta === d).map((o) => <li key={o.id}><b>{o.title}</b>{o.fields.ufficiale && <p className="help">Titolo ufficiale: {o.fields.ufficiale}</p>}{o.fields.spiegazione && <p>{o.fields.spiegazione}</p>}{o.fields.riguarda && <p className="riguarda"><b>Perché ti riguarda:</b> {o.fields.riguarda}</p>}<Link className="help" href={`/schede/odg/${o.slug}`}>Scheda</Link></li>)}</ol></section>)}
      <h2>Registro delle delibere</h2>{dl.length === 0 ? <p className="help">Nessuna delibera schedata.</p> : <ul className="trust-list">{dl.map((d) => <li key={d.id}><time dateTime={d.fields.data}>{day(d.fields.data)}</time><div><Link href={`/schede/delibera/${d.slug}`}>{d.fields.numero ? `Delibera n. ${d.fields.numero} · ` : ''}{d.title}</Link><p>{d.fields.oggetto}</p><p className="help">{d.fields.esito}{d.fields.voti ? ` · ${d.fields.voti.split('\n').filter(Boolean).length} votanti` : ''}{d.fields.testo && <> · <a href={d.fields.testo} rel="noopener" target="_blank">testo integrale</a></>}</p></div></li>)}</ul>}
      {m.names.length > 0 && <><h2>Chi ha votato cosa</h2><p className="help">✔ favorevole · ✕ contrario · ○ astenuto · – assente. <a href="/api/export/consiglio.csv" rel="nofollow">Scarica CSV</a></p><div className="table-scroll"><table className="data-table votes"><thead><tr><th>Consigliere</th>{dl.filter((d) => d.fields.voti).map((d) => <th key={d.id}><Link href={`/schede/delibera/${d.slug}`}>{d.fields.numero ? `n. ${d.fields.numero}` : d.title.slice(0, 18)}</Link></th>)}</tr></thead><tbody>{m.rows.map((r) => <tr key={r.name}><th>{r.name}</th>{r.votes.map((v, i) => <td key={i} className={`v-${v.slice(0, 3)}`} title={v}>{sym[v] ?? ''}</td>)}</tr>)}</tbody></table></div></>}
    </div></div>
  );
}
