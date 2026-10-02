import type { Metadata } from 'next';
import Link from 'next/link';
import { seriesStats } from '@/lib/civic';
import { findSeries, listCards } from '@/lib/civic-data';
import { floods, riverStatus } from '@/lib/emergency';

export const metadata: Metadata = { title: 'Fiumi e torrenti', description: 'Il livello di ogni corso d\'acqua, le soglie, lo storico delle piene.' };
export const dynamic = 'force-dynamic';
export default async function RiversPage() {
  const cards = await listCards('fiume'); const rows = await Promise.all(cards.map(async (c) => { const s = c.fields.serie ? await findSeries(c.fields.serie) : null; const st = s ? seriesStats(s.points) : null; const att = Number(c.fields.soglia_attenzione) || undefined, all = Number(c.fields.soglia_allarme) || undefined; return { c, s, st, status: riverStatus(st?.last?.v ?? null, att, all), floods: s && att ? floods(s.points, att) : [] }; }));
  return <div className="account" style={{ maxWidth: 820 }}><div className="account-card trust-page"><p className="kicker"><Link href="/emergenza">Emergenza</Link></p><h1>Fiumi e torrenti</h1><p className="lead">Il livello misurato, le soglie di attenzione e allarme, le piene degli anni passati.</p>{rows.length === 0 && <p className="help">Nessun corso d&apos;acqua in archivio.</p>}{rows.map(({ c, s, st, status, floods: f }) => <section key={c.id} className={`river river-${status.state}`}><h2><Link href={`/schede/fiume/${c.slug}`}>{c.title}</Link></h2><p><b>{st?.last ? `${st.last.v} ${s?.unit ?? 'm'}` : 'livello n.d.'}</b> {st?.last && <span className="help">il {new Date(st.last.d).toLocaleDateString('it-IT')} · tendenza {st.trend}</span>} · {status.label}{c.fields.stazione && <span className="help"> · stazione {c.fields.stazione}</span>}</p><p className="help">Soglie: attenzione {c.fields.soglia_attenzione || '—'} · allarme {c.fields.soglia_allarme || '—'}{c.fields.url && <> · <a href={c.fields.url} target="_blank" rel="noopener">fonte</a></>}</p>{f.length > 0 && <details><summary>Le piene registrate ({f.length})</summary><ul>{f.map((x) => <li key={x.from}>{x.from === x.to ? x.from : `${x.from} → ${x.to}`}: picco {x.peak} {s?.unit ?? 'm'}</li>)}</ul></details>}</section>)}</div></div>;
}
