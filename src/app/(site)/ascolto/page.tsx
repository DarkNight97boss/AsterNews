import type { Metadata } from 'next';
import { getSettings } from '@/lib/queries';
import { nextSession } from '@/lib/community';
import { ContributionForm } from '@/components/site/contribution-form';

export const metadata: Metadata = { title: 'Ore di ascolto', description: 'Un\'ora a settimana la redazione apre una stanza: entri, parli, ti ascoltiamo.' };
export const dynamic = 'force-dynamic';
export default async function ListeningPage() {
  const s = await getSettings(); const l = s.commons?.listening; const next = l?.enabled ? nextSession(l.weekday, l.time, new Date()) : null; const live = next ? Math.abs(+next - Date.now()) < 3_600_000 && +next <= Date.now() + 600_000 : false;
  return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Ore di ascolto</h1><p className="lead">Un&apos;ora a settimana non scriviamo: ascoltiamo. Entra nella stanza, anche solo con la voce, e dicci cosa non stiamo vedendo.</p>{!next ? <p className="help">Le ore di ascolto non sono ancora in calendario.</p> : <div className="listening-next"><p>Prossimo appuntamento</p><b>{next.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}, ore {l!.time}</b>{l!.note && <p>{l!.note}</p>}{l!.url && <a className="btn btn-primary" href={l!.url} target="_blank" rel="noopener">{live ? '🔴 Entra: siamo in linea' : 'Apri la stanza'}</a>}</div>}<ContributionForm kind="listen-topic" open /></div></div>;
}
