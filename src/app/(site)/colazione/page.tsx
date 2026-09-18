import type { Metadata } from 'next';
import Link from 'next/link';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories, getSettings } from '@/lib/queries';
import { readingTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Colazione: le notizie di oggi, con un inizio e una fine', description: 'Sette notizie scelte, una pagina sola, nessuno scroll infinito.' };
export const revalidate = 900;
/** Modalità colazione: una pagina finita. Sette pezzi al massimo (ultim'ora, evidenza, poi i più letti delle ultime 36 ore), senza barra laterale né «altri articoli». */
export default async function BreakfastPage() {
  const from = new Date(Date.now() - 36 * 3_600_000).toISOString(); const [recent, cats, s] = await Promise.all([listArticles({ status: 'published', from }, 'views', 40), getCategories(), getSettings()]);
  const pool = recent.length >= 4 ? recent : await listArticles({ status: 'published' }, 'published', 12); const rank = (a: (typeof pool)[number]) => (a.breaking ? 3 : 0) + (a.featured ? 2 : 0);
  const picks: typeof pool = []; for (const a of [...pool].sort((x, y) => rank(y) - rank(x) || y.views - x.views)) { if (picks.filter((p) => p.categoryId === a.categoryId).length >= 2) continue; picks.push(a); if (picks.length === 7) break; }
  const total = picks.reduce((n, a) => n + readingTime(a.content), 0); const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="breakfast"><header><p className="bf-date">{today}</p><h1>Buongiorno. Oggi bastano queste {picks.length}.</h1><p className="lead">Circa {total} minuti in tutto. Quando arrivi in fondo hai finito davvero.</p></header>
      <ol>{picks.map((a, i) => <li key={a.id}><span className="bf-n">{i + 1}</span><div><p className="bf-kicker">{cats.find((c) => c.id === a.categoryId)?.name} · {readingTime(a.content)} min</p><h2><Link href={articleUrlWith(a, cats)}>{a.extra?.titles?.home || a.title}</Link></h2><p>{a.excerpt || a.subtitle}</p></div></li>)}</ol>
      <footer><p className="bf-end">☕ Fine. Hai letto quello che conta oggi su {s.siteName}.</p><p className="help">Domani mattina questa pagina sarà nuova. Se vuoi altro c&apos;è sempre <Link href="/">la home</Link>, ma non è obbligatorio.</p></footer>
    </div>
  );
}
