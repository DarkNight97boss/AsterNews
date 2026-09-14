import type { Metadata } from 'next';
import Link from 'next/link';
import { ReportForm } from '@/components/site/report-form';
import { getPublishedReports, getZones, zone } from '@/lib/queries';
import { relativeDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Segnalazioni dei lettori', description: 'Buche, rifiuti, degrado, disservizi: le segnalazioni dei cittadini e le risposte della redazione.' };

export default function ReportsPage() {
  const reports = getPublishedReports();
  return (
    <>
      <div className="section-head"><h1>Segnalazioni</h1><p className="desc">Buche, rifiuti, disservizi, degrado: racconta cosa non va nel tuo quartiere. La redazione verifica e pubblica le segnalazioni, girandole alle istituzioni.</p></div>
      <div className="layout-sidebar">
        <div className="reports">
          {reports.length === 0 && <div className="empty"><h3>Nessuna segnalazione pubblicata</h3></div>}
          {reports.map((r) => { const z = zone(r.zoneId); return (
            <article key={r.id} className="report">
              <div className="report-head"><span className="kicker">{z ? <Link href={`/zone/${z.slug}`}>{z.name}</Link> : 'Segnalazione'}</span><span className="meta">{r.name} · {relativeDate(r.createdAt)}</span></div>
              <h3 className="serif">{r.subject}</h3>
              <div className="report-body">
                {r.image && <img src={r.image} alt="" />}
                <p>{r.body}</p>
              </div>
              {r.reply && <div className="report-reply"><b>Risposta della redazione</b><p>{r.reply}</p></div>}
            </article>
          ); })}
        </div>
        <aside className="sidebar"><div className="widget"><h3 className="widget-title">Invia una segnalazione</h3><ReportForm zones={getZones().map((z) => ({ id: z.id, name: z.name }))} /></div></aside>
      </div>
    </>
  );
}
