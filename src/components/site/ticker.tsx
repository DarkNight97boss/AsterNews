import Link from 'next/link';
import { articleUrlWith, getBreaking, getCategories, getSettings } from '@/lib/queries';

export async function Ticker() {
  const [s, breaking, cats] = await Promise.all([getSettings(), getBreaking(3), getCategories()]);
  if (!s.tickerEnabled) return null;
  const items = [...breaking.map((a) => ({ text: a.title, link: articleUrlWith(a, cats) })), ...s.ticker.map((t) => ({ text: t, link: '/notizie' }))];
  if (!items.length) return null;
  return (
    <div className="ticker"><div className="container"><span className="ticker-label">Ultim&apos;ora</span><div className="ticker-track"><div className="ticker-items">{items.map((t, i) => <Link key={i} href={t.link}>{t.text}</Link>)}{items.map((t, i) => <Link key={`b${i}`} href={t.link} aria-hidden="true">{t.text}</Link>)}</div></div></div></div>
  );
}
