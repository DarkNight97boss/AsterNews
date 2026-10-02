import type { Metadata } from 'next';
import Link from 'next/link';
import { EventCard } from '@/components/site/event-card';
import { getEvents } from '@/lib/queries';
import { familyTags, fitsAge } from '@/lib/school';
import { dayOffset } from '@/lib/utils';

export const metadata: Metadata = { title: 'Agenda per famiglie', description: 'Eventi per bambini e ragazzi, filtrati per età, con passeggino, gratis, al coperto.' };
export const dynamic = 'force-dynamic';
export default async function FamiliesPage({ searchParams }: PageProps<'/famiglie'>) {
  const sp = await searchParams; const age = Number(sp.eta) || 0; const only = (k: string) => sp[k] === '1';
  const all = (await getEvents({ from: dayOffset(0), to: dayOffset(31) }, 300)).map((e) => ({ e, t: familyTags(`${e.title} ${e.description}`) })).filter(({ e, t }) => e.type === 'bambini' || t.ageFrom !== null || /bambin|ragazz|famigli/i.test(e.title + e.description));
  const list = all.filter(({ t }) => (!age || fitsAge(t, age)) && (!only('passeggino') || t.stroller) && (!only('gratis') || t.free) && (!only('coperto') || t.indoor));
  return <><div className="page-head"><span className="kicker">Famiglie</span><h1>Agenda per famiglie</h1><p>Eventi per bambini e ragazzi nei prossimi 30 giorni. Chi li segnala può aggiungere nel testo <code>#eta3-6</code>, <code>#passeggino</code>, <code>#gratis</code>, <code>#alcoperto</code>.</p></div><form className="ef-form" style={{ marginBottom: 16 }}><label><span>Età del bambino</span><select className="select" name="eta" defaultValue={age || ''}><option value="">Qualsiasi</option>{[1, 2, 3, 4, 5, 6, 8, 10, 12, 14].map((n) => <option key={n} value={n}>{n} anni</option>)}</select></label>{[['passeggino', 'Si può portare il passeggino'], ['gratis', 'Solo gratis'], ['coperto', 'Al coperto']].map(([k, l]) => <label key={k} className="switch"><input type="checkbox" name={k} value="1" defaultChecked={only(k)} /> {l}</label>)}<button className="btn btn-dark" type="submit">Filtra</button></form>{list.length === 0 ? <div className="empty"><h3>Nessun evento</h3><p>Prova con un&apos;età diversa o senza filtri. <Link href="/eventi/segnala">Segnala tu un evento per famiglie</Link>.</p></div> : <div className="events-grid">{list.map(({ e, t }) => <div key={e.id}><EventCard event={e} /><p className="help" style={{ margin: '4px 0 0' }}>{[t.ageFrom !== null ? `${t.ageFrom}-${t.ageTo === 99 ? '+' : t.ageTo} anni` : '', t.stroller ? 'passeggino ok' : '', t.free ? 'gratis' : '', t.indoor ? 'al coperto' : ''].filter(Boolean).join(' · ')}</p></div>)}</div>}</>;
}
