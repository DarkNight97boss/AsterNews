import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories, getSettings, getZones } from '@/lib/queries';
import { stripCircles } from '@/lib/circles';
import { siteUrl } from '@/lib/site-url';
import { stripHtml } from '@/lib/utils';
import './stampa.scss';

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = 'force-dynamic';
/** Edizione stampabile di quartiere: un A4 fronte-retro da appendere nei bar. `/stampa/tutto` per l'intera città. */
export default async function PrintEditionPage({ params }: PageProps<'/stampa/[slug]'>) {
  const { slug } = await params; const [zones, cats, s] = await Promise.all([getZones(), getCategories(), getSettings()]); const zone = zones.find((z) => z.slug === slug); if (!zone && slug !== 'tutto') notFound();
  const from = new Date(Date.now() - 8 * 86_400_000).toISOString(); let arts = (await listArticles({ status: 'published', from, ...(zone ? { zoneId: zone.id } : {}) }, 'views', 12)).filter((a) => !a.premium); if (arts.length < 3) arts = (await listArticles({ status: 'published', ...(zone ? { zoneId: zone.id } : {}) }, 'published', 8)).filter((a) => !a.premium);
  const base = siteUrl(); const target = `${base}${zone ? `/zone/${zone.slug}` : ''}`; const qr = await QRCode.toDataURL(target, { margin: 0, width: 220 }); const [lead, ...rest] = arts; const week = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  const body = (html: string, n: number) => { const t = stripHtml(stripCircles(html)); return t.length > n ? t.slice(0, t.lastIndexOf(' ', n)) + '…' : t; };
  return (
    <div className="print-edition">
      <p className="pe-hint">Stampa questa pagina (fronte-retro, A4) e appendila: al bar, in farmacia, in bacheca. <button type="button" className="pe-print" data-print>Stampa</button></p>
      <header><h1>{s.siteName}</h1><p>{zone ? `Edizione di ${zone.name}` : 'Edizione della settimana'} · {week} · copia gratuita da appendere</p></header>
      {lead && <article className="pe-lead"><h2>{lead.title}</h2><p className="pe-sub">{lead.subtitle}</p><p>{body(lead.content, 1100)}</p></article>}
      <div className="pe-cols">{rest.slice(0, 7).map((a) => <article key={a.id}><p className="pe-kicker">{cats.find((c) => c.id === a.categoryId)?.name}</p><h3>{a.title}</h3><p>{body(a.content, 420)}</p><p className="pe-url">{base.replace(/^https?:\/\//, '')}{articleUrlWith(a, cats)}</p></article>)}</div>
      <footer><img src={qr} alt="" width={90} height={90} /><div><b>Il resto è online, ed è gratis da leggere.</b><p>Inquadra il codice oppure vai su {target.replace(/^https?:\/\//, '')}. Hai una notizia dal quartiere? {base.replace(/^https?:\/\//, '')}/segnalazioni</p></div></footer>
      <script dangerouslySetInnerHTML={{ __html: "document.querySelector('[data-print]')?.addEventListener('click',()=>window.print())" }} />
    </div>
  );
}
