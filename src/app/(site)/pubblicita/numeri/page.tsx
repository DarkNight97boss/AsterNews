import type { Metadata } from 'next';
import Link from 'next/link';
import { listAds } from '@/lib/repo-extra2';
import { adsTransparency } from '@/lib/economy';

export const metadata: Metadata = { title: 'La pubblicità, in numeri', description: 'Quanto vale davvero uno spazio pubblicitario qui: impressioni e clic aggregati per spazio, in forma pubblica.' };
export const dynamic = 'force-dynamic';
export default async function AdsNumbersPage() {
  const rows = adsTransparency(await listAds()); const tot = rows.reduce((n, r) => n + r.impressions, 0);
  return <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>La pubblicità, in numeri</h1><p className="lead">Ogni inserzionista ha la sua pagina con impressioni e clic della campagna. Qui gli stessi numeri in forma aggregata, per spazio, visibili a tutti: così un prezzo si giudica.</p>{rows.length === 0 ? <p className="help">Nessuna campagna registrata.</p> : <table className="data-table"><thead><tr><th>Spazio</th><th>Campagne</th><th>Impressioni</th><th>Clic</th><th>CTR</th></tr></thead><tbody>{rows.map((r) => <tr key={r.slot}><td>{r.slot}</td><td>{r.campaigns}</td><td>{r.impressions.toLocaleString('it-IT')}</td><td>{r.clicks.toLocaleString('it-IT')}</td><td>{r.ctr}%</td></tr>)}<tr><th>Totale</th><td /><td>{tot.toLocaleString('it-IT')}</td><td>{rows.reduce((n, r) => n + r.clicks, 0).toLocaleString('it-IT')}</td><td /></tr></tbody></table>}<p className="help"><Link href="/pubblicita">Prezzi e acquisto</Link> · <Link href="/sponsor">Sponsor di sezione</Link> · <Link href="/trasparenza">Chi ci paga</Link></p></div></div>;
}
