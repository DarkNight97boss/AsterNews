import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings, getZones, zoneCounts } from '@/lib/queries';

export const metadata: Metadata = { title: 'Notizie dalle zone', description: 'Le notizie quartiere per quartiere e dai comuni della provincia.' };

export default async function ZonesPage() {
  const [zones, counts, settings] = await Promise.all([getZones(), zoneCounts(), getSettings()]);
  const letters = [...new Set(zones.map((z) => z.name[0].toUpperCase()))].sort();
  const byLetter = (l: string, kind: 'comune' | 'zona') => zones.filter((z) => z.kind === kind && z.name[0].toUpperCase() === l);
  return (
    <>
      <div className="section-head"><h1>Zone di {settings.weatherCity}</h1><p className="desc">Le notizie dai quartieri e dai comuni della provincia.</p></div>
      <div className="letter-nav">{letters.map((l) => <a key={l} href={`#lettera-${l}`}>{l}</a>)}</div>
      {letters.map((l) => (
        <section key={l} id={`lettera-${l}`} className="zone-letter">
          <div className="zl-letter serif">{l}</div>
          <div><div className="zl-head">Comune</div>{byLetter(l, 'comune').map((z) => <Link key={z.id} href={`/zone/${z.slug}`} className="zl-item"><span>{z.name}</span><span className="zl-count">({counts[z.id] ?? 0})</span></Link>)}{byLetter(l, 'comune').length === 0 && <span className="zl-empty">—</span>}</div>
          <div><div className="zl-head">Zona</div>{byLetter(l, 'zona').map((z) => <Link key={z.id} href={`/zone/${z.slug}`} className="zl-item"><span>{z.name}</span><span className="zl-count">({counts[z.id] ?? 0})</span></Link>)}{byLetter(l, 'zona').length === 0 && <span className="zl-empty">—</span>}</div>
        </section>
      ))}
    </>
  );
}
