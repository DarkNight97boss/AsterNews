import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/queries';
import { listCards, approvedContrib } from '@/lib/civic-data';
import { parseLines, parseResults } from '@/lib/civic';
import { listRecords } from '@/lib/records';
import { Compass } from '@/components/site/compass';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Elezioni', description: 'Candidati a confronto senza retorica, la bussola locale, i risultati per seggio e il diario della campagna.' };
export const dynamic = 'force-dynamic';
export default async function ElectionsPage() {
  const [s, candidates, themes, seggi, diary, posters] = await Promise.all([getSettings(), listCards('candidato'), listCards('tema'), listCards('seggio'), listRecords<{ date: string; text: string; image?: string }>('campaign', { limit: 200, order: 'old' }), approvedContrib('manifesto')]);
  const topics = [...new Set(candidates.flatMap((c) => parseLines(c.fields.posizioni).map((p) => p.k)))]; const day = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeline = [...diary.map((d) => ({ date: d.data.date, text: d.data.text, image: d.data.image })), ...posters.map((p) => ({ date: p.createdAt.slice(0, 10), text: `Manifesto: ${p.data.text} (${p.data.where})`, image: p.data.image }))].sort((a, b) => b.date.localeCompare(a.date));
  const elections = [...new Set(seggi.map((x) => x.fields.elezione).filter(Boolean))];
  return (
    <div className="account" style={{ maxWidth: 900 }}><div className="account-card trust-page"><h1>{s.civic?.electionTitle || 'Elezioni'}</h1><p className="lead">Chi si candida, cosa dice davvero, come ha votato chi c&apos;era già. Senza retorica: una frase per tema, con la fonte.</p>
      {candidates.length === 0 ? <p className="help">La redazione non ha ancora pubblicato le schede dei candidati.</p> : <>
        <h2>I candidati</h2><ul className="hub-grid">{candidates.map((c) => <li key={c.id}>{c.fields.foto && <img src={c.fields.foto} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%' }} />}<Link href={`/schede/candidato/${c.slug}`}>{c.title}</Link><p>{[c.fields.lista, c.fields.ruolo].filter(Boolean).join(' · ')}</p></li>)}</ul>
        {topics.length > 0 && <><h2>Confronto per tema</h2><div className="table-scroll"><table className="data-table compare"><thead><tr><th>Tema</th>{candidates.map((c) => <th key={c.id}>{c.title}</th>)}</tr></thead><tbody>{topics.map((t) => <tr key={t}><th>{t}</th>{candidates.map((c) => <td key={c.id}>{parseLines(c.fields.posizioni).find((p) => p.k === t)?.v || <span className="help">non si è espresso</span>}</td>)}</tr>)}</tbody></table></div></>}
        {themes.length > 0 && <Compass themes={themes.map((t) => ({ slug: t.slug, question: t.fields.domanda || t.title, hint: t.fields.spiegazione ?? '' }))} candidates={candidates.map((c) => ({ title: c.title, slug: c.slug, risposte: c.fields.risposte ?? '' }))} />}</>}
      {seggi.length > 0 && <><h2>Il voto, seggio per seggio</h2>{elections.map((e) => <section key={e}><h3>{e}</h3><ul className="trust-list">{seggi.filter((x) => x.fields.elezione === e).map((x) => { const r = parseResults(x.fields.risultati); return <li key={x.id}><div><Link href={`/schede/seggio/${x.slug}`}>Sezione {x.fields.numero} · {x.fields.indirizzo}</Link><p className="help">{r.slice(0, 3).map((y) => `${y.list} ${y.percent}%`).join(' · ')}{x.fields.elettori && x.fields.votanti ? ` · affluenza ${Math.round((Number(x.fields.votanti) / Number(x.fields.elettori)) * 100)}%` : ''}</p></div></li>; })}</ul></section>)}</>}
      <h2>Diario della campagna</h2>{timeline.length === 0 && <p className="help">Il diario è vuoto: la redazione annota gli eventi e i lettori fotografano i manifesti.</p>}<ul className="trust-list">{timeline.slice(0, 60).map((t, i) => <li key={i}><time dateTime={t.date}>{day(t.date)}</time><div><p>{t.text}</p>{t.image && <img src={t.image} alt="" loading="lazy" style={{ maxWidth: 280, borderRadius: 6 }} />}</div></li>)}</ul><ContributionForm kind="manifesto" refId="elezioni" />
    </div></div>
  );
}
