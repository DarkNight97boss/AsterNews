import Link from 'next/link';
import type { SiteSettings } from '@/lib/models';
import { activeSeason, countdown } from '@/lib/personal';
import { SilenceSubscribe } from './guestbook';

/** Avvisi in cima al sito: stagione in corso, silenzio dichiarato, sito conservato (testamento digitale), modalità evento. */
export function SiteBanners({ settings: s }: { settings: SiteSettings }) {
  const p = s.personal ?? {}; const now = Date.now(); const season = activeSeason(p.seasons, new Date(now).toISOString()); const silence = p.silence?.until && !countdown(p.silence.until, now).over ? p.silence : null; const frozen = p.legacy?.triggeredAt ? p.legacy : null; const ev = p.eventMode?.enabled && p.eventMode.until && !countdown(p.eventMode.until, now).over ? p.eventMode : null;
  if (!season?.banner && !silence && !frozen && !ev) return null;
  return (
    <div className="site-banners">
      {frozen && <div className="sb sb-frozen"><b>Questo sito è conservato così com&apos;era.</b> {frozen.message || 'Chi lo scriveva non lo aggiorna più: i testi restano leggibili.'}</div>}
      {ev && <div className="sb sb-event"><b>{ev.title}</b> · <Link href="/speciale">segui lo speciale</Link></div>}
      {season?.banner && <div className={`sb sb-season${season.mourning ? ' sb-mourning' : ''}`}>{season.banner}</div>}
      {silence && <div className="sb sb-silence"><span>🌙 {silence.message || 'Mi prendo una pausa.'} <b>Torno tra {countdown(silence.until, now).days} giorni</b> ({new Date(silence.until).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}).</span><SilenceSubscribe /></div>}
    </div>
  );
}
