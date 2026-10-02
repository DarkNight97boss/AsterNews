import type { Metadata } from 'next';
import { listArticles } from '@/lib/repo';
import { getSettings } from '@/lib/queries';
import { publicContent } from '@/lib/content-render';
import { stripHtml } from '@/lib/utils';
import '../[slug]/stampa.scss';

export const metadata: Metadata = { robots: { index: false } };
export const dynamic = 'force-dynamic';
/** Lettera settimanale cartacea: carattere grande, una colonna, cinque notizie della settimana. Per chi la consegna a mano a chi non legge sullo schermo. */
export default async function WeeklyLetterPage() {
  const s = await getSettings(); const from = new Date(Date.now() - 7 * 86_400_000).toISOString(); const arts = (await listArticles({ status: 'published', from }, 'views', 5)).filter((a) => !a.premium); const texts = await Promise.all(arts.map(async (a) => stripHtml(await publicContent(a.content))));
  return <div className="print-edition letter"><p className="pe-hint">Lettera della settimana a caratteri grandi: stampala e consegnala a chi non legge sullo schermo. <button type="button" className="pe-print" data-print>Stampa</button></p><header><h1>{s.siteName}</h1><p>Lettera della settimana · {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p></header><p className="letter-intro">Care lettrici, cari lettori, ecco le cinque cose successe questa settimana.</p>{arts.map((a, i) => <article key={a.id} className="letter-item"><h2>{i + 1}. {a.title}</h2><p>{(texts[i] || a.excerpt).slice(0, 700)}{(texts[i] || '').length > 700 ? '…' : ''}</p></article>)}<footer><div><b>Con affetto, la redazione.</b><p>Se vuoi riceverla ogni settimana, chiedi a chi te l&apos;ha portata: si stampa da {process.env.NEXT_PUBLIC_SITE_URL ?? ''}/stampa/lettera.</p></div></footer><script dangerouslySetInnerHTML={{ __html: "document.querySelector('[data-print]')?.addEventListener('click',()=>window.print())" }} /></div>;
}
