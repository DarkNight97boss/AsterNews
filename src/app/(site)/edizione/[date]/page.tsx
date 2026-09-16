import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories, getSettings, listPublished } from '@/lib/queries';
import { ArticleBody } from '@/components/site/article-body';

export const dynamic = 'force-dynamic';
const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shift = (d: string, n: number) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
export async function generateMetadata({ params }: PageProps<'/edizione/[date]'>): Promise<Metadata> { const { date } = await params; return { title: `Edizione del ${valid(date) ? fmt(date) : 'giorno'}`, robots: { index: false } }; }

/** Edizione digitale sfogliabile del giorno: tutti gli articoli pubblicati, impaginati per sezione, stampabili in PDF. */
export default async function EditionPage({ params }: PageProps<'/edizione/[date]'>) {
  const { date: raw } = await params; const date = valid(raw) ? raw : new Date().toISOString().slice(0, 10);
  const [all, cats, s] = await Promise.all([listPublished({}, 400), getCategories(), getSettings()]);
  const day = all.filter((a) => (a.publishedAt ?? '').slice(0, 10) === date);
  const sections = cats.map((c) => ({ cat: c, items: day.filter((a) => a.categoryId === c.id) })).filter((x) => x.items.length);
  return (
    <div className="edition">
      <div className="edition-head noprint"><Link href={`/edizione/${shift(date, -1)}`}>← giorno prima</Link><span>{fmt(date)}</span><Link href={`/edizione/${shift(date, 1)}`}>giorno dopo →</Link><a className="btn btn-outline btn-sm" href="#" onClick={undefined} data-print="1">🖨 Stampa / PDF</a></div>
      <header className="edition-masthead"><div className="edition-logo">{s.siteName}</div><div className="edition-date">{fmt(date)} · Edizione digitale · {day.length} articoli</div></header>
      {sections.length === 0 && <p className="help" style={{ textAlign: 'center', padding: 40 }}>Nessun articolo pubblicato in questa data.</p>}
      {sections.map(({ cat, items }) => <section key={cat.id} className="edition-section"><h2 style={{ borderColor: cat.color }}>{cat.name}</h2>{items.map((a) => <article key={a.id} className="edition-article"><div className="kicker">{a.kicker}</div><h3>{a.title}</h3>{a.subtitle && <p className="sub">{a.subtitle}</p>}{a.coverImage && <img src={a.coverImage} alt="" loading="lazy" />}<div className="edition-body"><ArticleBody html={a.content} className="article-body" articleId={a.id} /></div></article>)}</section>)}
      <footer className="edition-foot">© {s.siteName} · Riproduzione riservata</footer>
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('click',function(e){var t=e.target.closest('[data-print]');if(t){e.preventDefault();window.print();}});" }} />
    </div>
  );
}
