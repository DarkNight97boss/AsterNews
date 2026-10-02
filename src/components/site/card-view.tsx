import Link from 'next/link';
import type { Card } from '@/lib/civic';
import { CARD_KINDS, delayDays, parseLines, parseResults, seriesStats } from '@/lib/civic';
import { cardCommitments, cardEvents, findSeries, approvedContrib } from '@/lib/civic-data';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';
import { ContributionForm } from './contribution-form';

const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const money = (v?: string) => (v ? Number(v).toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }) : '');
/** Una scheda qualsiasi: campi, corpo, linea del tempo, impegni, articoli collegati, più le parti specifiche del tipo. */
export async function CardView({ card }: { card: Card }) {
  const def = CARD_KINDS[card.kind]; const cats = await getCategories(); const now = Date.now();
  const [events, commitments, arts] = await Promise.all([cardEvents(card.id), cardCommitments(card.id), card.tagId ? listArticles({ status: 'published', tagId: card.tagId }, 'published', 30) : listArticles({ status: 'published', q: card.title }, 'published', 12)]);
  const f = card.fields; const delay = card.kind === 'cantiere' ? delayDays(f.fine_prevista, f.fine_effettiva, now) : null;
  const photos = card.kind === 'cantiere' ? await approvedContrib('cantiere-foto') : []; const voices = card.kind === 'scuola' ? (await approvedContrib('voce-genitori')).filter((v) => v.ref === card.id) : []; const memories = card.kind === 'persona' ? (await approvedContrib('memory')).filter((m) => m.ref === card.id) : [];
  const schoolArts = card.kind === 'scuola' ? (await listArticles({ status: 'published', extraLike: `"school":"${card.id}"` }, 'published', 20)).filter((a) => a.extra?.school === card.id) : [];
  const river = card.kind === 'fiume' && f.serie ? await findSeries(f.serie) : null; const rs = river ? seriesStats(river.points) : null;
  const mark: Record<string, string> = { kept: '✔ mantenuto', missed: '✕ non mantenuto', right: '✔ avverata', partial: '≈ in parte', wrong: '✕ non avverata' };
  return (
    <article className="card-page">
      <p className="kicker"><Link href="/schede">Schede</Link> · <Link href={`/schede/${card.kind}`}>{def.plural}</Link></p>
      <h1>{def.icon} {card.title}</h1>
      {card.image && <img className="card-img" src={card.image} alt="" />}
      {delay !== null && <p className={`delay-badge ${delay > 0 && !f.fine_effettiva ? 'late' : 'ok'}`}>{f.fine_effettiva ? (delay > 0 ? `Concluso con ${delay} giorni di ritardo` : `Concluso ${-delay} giorni prima del previsto`) : delay > 0 ? `${delay} giorni di ritardo sulla fine promessa (${day(f.fine_prevista)})` : `Mancano ${-delay} giorni alla fine promessa (${day(f.fine_prevista)})`}</p>}
      {rs?.last && <p className={`delay-badge ${Number(f.soglia_allarme) && rs.last.v >= Number(f.soglia_allarme) ? 'late' : Number(f.soglia_attenzione) && rs.last.v >= Number(f.soglia_attenzione) ? 'warn' : 'ok'}`}>Livello {rs.last.v} {river?.unit} il {day(rs.last.d)}{Number(f.soglia_allarme) && rs.last.v >= Number(f.soglia_allarme) ? ' · SOGLIA DI ALLARME SUPERATA' : Number(f.soglia_attenzione) && rs.last.v >= Number(f.soglia_attenzione) ? ' · soglia di attenzione superata' : ''} · tendenza {rs.trend}</p>}
      <dl className="card-fields">{def.fields.filter((x) => f[x.key] && x.key !== 'risposte' && x.key !== 'voti' && x.key !== 'risultati').map((x) => <div key={x.key}><dt>{x.label}</dt><dd>{x.type === 'url' ? <a href={f[x.key]} rel="noopener" target="_blank">{f[x.key].replace(/^https?:\/\//, '').slice(0, 60)}</a> : x.type === 'date' ? day(f[x.key]) : x.key === 'importo' || x.key === 'base' ? money(f[x.key]) : x.type === 'textarea' ? <span style={{ whiteSpace: 'pre-line' }}>{f[x.key]}</span> : f[x.key]}</dd></div>)}</dl>
      {card.kind === 'delibera' && f.voti && <section><h2>Chi ha votato</h2><ul className="vote-list">{parseLines(f.voti).map((v) => <li key={v.k} className={`v-${v.v.toLowerCase().slice(0, 3)}`}><span>{v.k}</span><b>{v.v}</b></li>)}</ul></section>}
      {card.kind === 'seggio' && f.risultati && <section><h2>Risultati</h2><ul className="result-list">{parseResults(f.risultati).map((r) => <li key={r.list}><span>{r.list}</span><div className="funding-bar"><span style={{ width: `${r.percent}%` }} /></div><b>{r.votes.toLocaleString('it-IT')} · {r.percent}%</b></li>)}</ul>{f.elettori && f.votanti && <p className="help">Affluenza {Math.round((Number(f.votanti) / Number(f.elettori)) * 100)}% ({f.votanti} su {f.elettori})</p>}</section>}
      {card.body && <div className="article-body" dangerouslySetInnerHTML={{ __html: card.body }} />}
      {commitments.length > 0 && <section className="promises"><b>Impegni e previsioni</b><ul>{commitments.map((c) => <li key={c.id} className={c.status === 'done' ? `pr-${c.data.outcome}` : ''}>{c.data.who && c.data.who !== card.title ? `${c.data.who}: ` : ''}{c.data.text} <span className="help">{c.status === 'done' ? `${mark[c.data.outcome ?? ''] ?? 'verificata'}${c.data.note ? `: ${c.data.note}` : ''}` : `entro il ${day(c.dueAt)}`}</span></li>)}</ul></section>}
      {(events.length > 0 || photos.some((p) => p.ref === card.id)) && <section><h2>Linea del tempo</h2><ul className="trust-list">{[...events.map((e) => ({ date: e.date, text: e.text, image: e.image })), ...photos.filter((p) => p.ref === card.id).map((p) => ({ date: p.createdAt.slice(0, 10), text: p.data.text || 'Foto di un lettore', image: p.data.image }))].sort((a, b) => a.date.localeCompare(b.date)).map((e, i) => <li key={i}><time dateTime={e.date}>{day(e.date)}</time><div><p>{e.text}</p>{e.image && <img src={e.image} alt="" loading="lazy" style={{ maxWidth: 320, borderRadius: 6 }} />}</div></li>)}</ul></section>}
      {card.kind === 'cantiere' && <ContributionForm kind="cantiere-foto" refId={card.id} />}
      {card.kind === 'scuola' && <section><h2>Il giornale della scuola</h2>{schoolArts.length === 0 ? <p className="help">La redazione studentesca non ha ancora pubblicato. <Link href="/giornali-scolastici">Tutti i giornali delle scuole</Link>.</p> : <ul className="trust-list">{schoolArts.map((a) => <li key={a.id}><time dateTime={a.publishedAt ?? ''}>{day(a.publishedAt)}</time><div><Link href={articleUrlWith(a, cats)}>{a.title}</Link>{a.byline && <p className="help">{a.byline}</p>}</div></li>)}</ul>}</section>}
      {card.kind === 'scuola' && <section><h2>La voce dei genitori</h2>{voices.length === 0 && <p className="help">Ancora nessuna voce.</p>}{voices.map((v) => <blockquote key={v.id}><p>{v.data.text}</p><footer>{day(v.createdAt)}</footer></blockquote>)}<ContributionForm kind="voce-genitori" refId={card.id} /></section>}
      {card.kind === 'persona' && <section className="memories"><h2>I ricordi di chi l&apos;ha conosciuta</h2>{memories.length === 0 && <p className="help">Il primo ricordo può essere il tuo.</p>}{memories.map((m) => <blockquote key={m.id}><p>{m.data.text}</p><footer>{m.data.name}{m.data.relation ? `, ${m.data.relation}` : ''}</footer></blockquote>)}<ContributionForm kind="memory" refId={card.id} /></section>}
      {arts.length > 0 && <section><h2>Negli articoli</h2><ul className="trust-list">{arts.map((a) => <li key={a.id}><time dateTime={a.publishedAt ?? ''}>{day(a.publishedAt)}</time><div><Link href={articleUrlWith(a, cats)}>{a.title}</Link></div></li>)}</ul></section>}
    </article>
  );
}
