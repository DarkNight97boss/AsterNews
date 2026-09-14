import Link from 'next/link';
import { articleUrl, getBreaking, getSettings } from '@/lib/queries';

export function Ticker() {
  const s = getSettings();
  if (!s.tickerEnabled) return null;
  const items = [...getBreaking().slice(0, 3).map((a) => ({ text: a.title, link: articleUrl(a) })), ...s.ticker.map((t) => ({ text: t, link: '/notizie' }))];
  if (!items.length) return null;
  return (
    <div className="ticker">
      <div className="container">
        <span className="ticker-label">Ultim&apos;ora</span>
        <div className="ticker-track">
          <div className="ticker-items">
            {items.map((t, i) => <Link key={i} href={t.link}>{t.text}</Link>)}
            {items.map((t, i) => <Link key={`b${i}`} href={t.link} aria-hidden="true">{t.text}</Link>)}
          </div>
        </div>
      </div>
    </div>
  );
}
