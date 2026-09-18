import type { Metadata } from 'next';
import Link from 'next/link';
import { listArticles } from '@/lib/repo';
import { articleUrlWith, getCategories } from '@/lib/queries';

export const metadata: Metadata = { title: 'Registro delle correzioni', description: 'Tutti gli errori che abbiamo corretto dopo la pubblicazione, in ordine di data.' };
export const dynamic = 'force-dynamic';
export default async function CorrectionsPage() {
  const [arts, cats] = await Promise.all([listArticles({ status: 'published', extraHas: 'corrections' }, 'updated', 300), getCategories()]);
  const rows = arts.flatMap((a) => (a.extra?.corrections ?? []).map((c) => ({ ...c, title: a.title, url: articleUrlWith(a, cats) }))).sort((x, y) => y.date.localeCompare(x.date));
  const byMonth = new Map<string, typeof rows>(); for (const r of rows) { const k = r.date.slice(0, 7); byMonth.set(k, [...(byMonth.get(k) ?? []), r]); }
  return (
    <div className="account" style={{ maxWidth: 760 }}><div className="account-card trust-page"><h1>Registro delle correzioni</h1>
      <p className="lead">Sbagliamo anche noi. Quando succede correggiamo il testo e lo scriviamo qui, senza cancellare niente: {rows.length} {rows.length === 1 ? 'correzione' : 'correzioni'} finora.</p>
      {rows.length === 0 && <p className="help">Nessuna correzione registrata.</p>}
      {[...byMonth.entries()].map(([m, list]) => <section key={m}><h2>{new Date(`${m}-01`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</h2><ul className="trust-list">{list.map((r, i) => <li key={i}><time dateTime={r.date}>{new Date(r.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</time><div><Link href={r.url}>{r.title}</Link><p>{r.text}</p></div></li>)}</ul></section>)}
      <p className="help">Hai trovato un errore? In fondo a ogni articolo c&apos;è «Segnala un errore». Vedi anche <Link href="/trasparenza">come lavoriamo e chi ci paga</Link>.</p>
    </div></div>
  );
}
