import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { randomDay } from '@/lib/archive';
import { archiveDays, archiveMonths } from '@/lib/insights';

export const metadata: Metadata = { title: 'Il giornale di un giorno qualsiasi', description: 'Scegli una data, o lasciati portare a caso: la prima pagina di quel giorno, ricostruita dall\'archivio.' };
export const dynamic = 'force-dynamic';
export default async function AnyDayPage({ searchParams }: PageProps<'/giornale'>) {
  const sp = await searchParams; const months = await archiveMonths();
  if (sp.caso !== undefined && months.length) { const m = months[Math.floor(Math.random() * months.length)]; const d = randomDay(await archiveDays(m.month)); if (d) redirect(`/giornale/${d}`); }
  if (typeof sp.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.data)) redirect(`/giornale/${sp.data}`);
  const first = months[months.length - 1]?.month; const last = months[0]?.month;
  return <div className="account" style={{ maxWidth: 680 }}><div className="account-card trust-page"><h1>Il giornale di un giorno qualsiasi</h1><p className="lead">Com&apos;era la prima pagina il giorno in cui sei nato, ti sei sposato, hai cambiato casa? L&apos;archivio va {first ? `da ${first.slice(5, 7)}/${first.slice(0, 4)} a ${last!.slice(5, 7)}/${last!.slice(0, 4)}` : 'ancora riempito'}.</p><form method="get" className="form-row"><input className="input" type="date" name="data" aria-label="Data" min={first ? `${first}-01` : undefined} max={new Date().toISOString().slice(0, 10)} required /><button className="btn btn-primary" type="submit">Apri quel giorno</button><Link className="btn btn-outline" href="/giornale?caso">Un giorno a caso</Link></form><p className="help"><Link href="/archivio">L&apos;archivio per data</Link> · <Link href="/annate">Le annate</Link> · <Link href="/accadde-oggi">Accadde oggi</Link></p></div></div>;
}
