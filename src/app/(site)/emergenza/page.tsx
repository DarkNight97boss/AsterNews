import type { Metadata } from 'next';
import Link from 'next/link';
import { ContributionForm } from '@/components/site/contribution-form';
import { closureGroups, groupByZone, LEVEL_LABELS } from '@/lib/emergency';
import { listClosures, listDiary, listOk } from '@/lib/emergency-data';
import { getSettings } from '@/lib/queries';

export const metadata: Metadata = { title: 'Emergenza', description: 'Aggiornamenti verificati, chiusure, lista «sto bene», SMS d\'emergenza e punti utili.' };
export const dynamic = 'force-dynamic';
export default async function EmergencyPage({ searchParams }: PageProps<'/emergenza'>) {
  const [s, sp] = await Promise.all([getSettings(), searchParams]); const em = s.emergency; const active = !!em?.active; const id = em?.emergencyId ?? '';
  const [diary, closures, ok] = await Promise.all([active ? listDiary(id, 100) : [], listClosures(), active ? listOk(id) : []]); const q = typeof sp.cerca === 'string' ? sp.cerca.slice(0, 60) : ''; const zones = groupByZone(ok, q); const open = closures.filter((c) => c.status !== 'riaperto');
  const fmt = (iso: string) => new Date(iso).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return <div className="account" style={{ maxWidth: 820 }}><div className={`account-card trust-page emergency ${active ? `em-${em!.level ?? 'rosso'}` : ''}`}>
    {active ? <><p className="kicker">{LEVEL_LABELS[em!.level ?? 'rosso']} · dal {fmt(em!.since ?? '')}</p><h1>🚨 {em!.title}</h1>{em!.text && <p className="lead">{em!.text}</p>}</> : <><h1>Emergenza</h1><p className="lead">Nessuna emergenza dichiarata. Questa pagina si accende quando serve: aggiornamenti verificati, chiusure, la lista «sto bene» e gli SMS. Intanto puoi iscrivere il numero e conoscere i <Link href="/punti-utili">punti utili</Link>.</p></>}
    <p className="em-links"><Link href="/chiusure">Chiusure ({open.length})</Link> · <Link href="/catene">Verifica di un messaggio che gira</Link> · <Link href="/punti-utili">Punti utili</Link> · <Link href="/fiumi">Fiumi</Link> · <Link href="/emergenze">Emergenze passate</Link></p>
    {active && <section><h2>Il diario dell&apos;emergenza</h2><p className="help">Solo cose verificate dalla redazione, con l&apos;ora e la fonte. Il più recente in alto.</p>{diary.length === 0 && <p className="help">Nessun aggiornamento ancora.</p>}<ul className="em-diary">{diary.map((d) => <li key={d.id}><time dateTime={d.at}>{fmt(d.at)}</time><div>{d.text}{d.source && <span className="help"> · fonte: {d.source}</span>}</div></li>)}</ul></section>}
    {active && open.length > 0 && <section><h2>Chiusure in corso</h2>{closureGroups(open).map((g) => <p key={g.kind}><b>{g.label}:</b> {g.items.map((c) => `${c.name}${c.status === 'parziale' ? ' (parziale)' : ''}${c.until ? ` fino al ${c.until}` : ''}`).join(' · ')}</p>)}<p className="help"><Link href="/chiusure">Tutte le chiusure e come segnalarne una</Link></p></section>}
    {active && <section className="em-ok"><h2>Lista «sto bene»</h2><p className="help">Chi non riesce a rispondere al telefono lascia qui il nome: chi lo cerca lo trova. Niente altro dato.</p><ContributionForm kind="sto-bene" refId={id} open /><form method="get" className="form-row" style={{ marginTop: 10 }}><input className="input" type="search" name="cerca" placeholder="Cerca un nome" aria-label="Cerca" defaultValue={q} /><button className="btn btn-outline" type="submit">Cerca</button></form><p className="help">{ok.length} {ok.length === 1 ? 'persona' : 'persone'} in lista.</p>{zones.map((z) => <div key={z.zone}><h3>{z.zone}</h3><ul className="em-names">{z.items.map((p) => <li key={p.id}><b>{p.name}</b>{p.message && <span className="help"> · {p.message}</span>} <small>{fmt(p.createdAt)}</small></li>)}</ul></div>)}</section>}
    <section><h2>SMS d&apos;emergenza</h2><p className="help">Quando internet non regge, un SMS passa. Il numero serve solo per questo e non viene mai usato per altro.</p><ContributionForm kind="sms-emergenza" /></section>
  </div></div>;
}
